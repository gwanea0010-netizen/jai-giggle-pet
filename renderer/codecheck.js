// Quick, offline review of SQL / C# the developer copies. Pure regex heuristics:
// nothing leaves the machine. Returns [{ level: 'high'|'mid'|'low', text }] ordered by severity.
(function (root) {
  const ORDER = { high: 0, mid: 1, low: 2 };

  const stripComments = (s) => s.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const maskStrings = (s) => s.replace(/N?'(?:[^']|'')*'/g, "''");
  const statements = (s) => s.split(/;|\n\s*GO\s*(?:\n|$)/i).map((x) => x.trim()).filter(Boolean);

  function looksSql(text) {
    const hits = (text.match(/\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|TRUNCATE|TABLE|JOIN|GROUP BY|ORDER BY|CREATE|ALTER|PROCEDURE|EXEC|BEGIN TRAN|DECLARE)\b/gi) || []).length;
    return hits >= 2 && !/\b(namespace|public\s+class|using\s+System)\b/.test(text);
  }

  function looksCSharp(text) {
    return /\b(namespace|public|private|protected|var|async|await|class|using\s+System|new\s+\w+\s*\()\b/.test(text) && /[;{}]/.test(text);
  }

  function sql(text) {
    const raw = stripComments(text);
    const s = maskStrings(raw);
    const out = [];
    const add = (level, msg) => out.push({ level, text: msg });

    for (const st of statements(s)) {
      if (/\bUPDATE\s+[\w.[\]#@]+\s+SET\b/i.test(st) && !/\bWHERE\b/i.test(st) && !/\bFROM\b/i.test(st)) {
        add('high', '⚠️ UPDATE without WHERE changes EVERY row! Add a WHERE (run it as a SELECT first).');
      }
      if (/^\s*(WITH\b[\s\S]*?\)\s*)?DELETE\b/i.test(st) && !/\bWHERE\b/i.test(st) && !/\bJOIN\b/i.test(st)) {
        add('high', '⚠️ DELETE without WHERE removes ALL rows! Double-check, and wrap it in a transaction.');
      }
    }
    if (/\bTRUNCATE\s+TABLE\b/i.test(s)) add('high', '⚠️ TRUNCATE wipes the whole table and can’t be filtered. Sure about this one?');
    if (/\bEXEC(UTE)?\s*\(\s*@/i.test(s) || /\bEXEC(UTE)?\s*\(\s*''\s*\+/i.test(s) || /''\s*\+\s*@\w+\s*\+\s*''/.test(s)) {
      add('high', '🔐 Dynamic SQL glued with + can be injected. Use sp_executesql with @parameters.');
    }
    if (/(=|<>|!=)\s*NULL\b/i.test(s)) add('high', '🕳️ "= NULL" is never true. Use IS NULL / IS NOT NULL.');
    if (/\bBEGIN\s+TRAN/i.test(s) && !/\b(COMMIT|ROLLBACK)\b/i.test(s)) add('high', '🔒 BEGIN TRAN without COMMIT/ROLLBACK leaves locks open.');

    if (/\bNOT\s+IN\s*\(\s*SELECT\b/i.test(s)) add('mid', '🤔 NOT IN (SELECT…) returns nothing if the subquery has a NULL. Prefer NOT EXISTS.');
    if (/COUNT\s*\(\s*\*\s*\)\s*\)?\s*>\s*0/i.test(s)) add('mid', '⚡ Use IF EXISTS (…) instead of COUNT(*) > 0. It stops at the first row.');
    if (/\bWHERE\b[\s\S]*?\b(YEAR|MONTH|DAY|CONVERT|CAST|UPPER|LOWER|LTRIM|RTRIM|ISNULL|COALESCE|DATEPART|SUBSTRING|LEFT|RIGHT)\s*\(/i.test(s)) {
      add('mid', '🐢 A function around a column in WHERE blocks index use. Compare a range instead, e.g. Date >= @From AND Date < @To.');
    }
    if (/\bLIKE\s+N?'%/i.test(raw)) add('mid', '🐢 LIKE \'%text\' (leading %) can’t use an index. Use \'text%\' or full-text search if possible.');
    if (/\b(NOLOCK|READUNCOMMITTED)\b/i.test(s)) add('mid', '👻 NOLOCK can return dirty, missing or duplicate rows. Avoid it for money/stock data.');
    if (/\bCURSOR\b/i.test(s)) add('mid', '🐌 Cursors loop row by row. A set-based UPDATE / INSERT…SELECT is usually much faster.');
    if (/\bCREATE\s+(OR\s+ALTER\s+)?PROC(EDURE)?\b/i.test(s) && !/\bSET\s+NOCOUNT\s+ON\b/i.test(s)) add('mid', '📨 Add SET NOCOUNT ON at the top of the procedure (less chatter, faster).');
    if (/\bTOP\s*\(?\s*\d+/i.test(s) && !/\bORDER\s+BY\b/i.test(s)) add('mid', '🎲 TOP without ORDER BY returns random rows. Add an ORDER BY.');
    if (/\bBEGIN\s+TRAN/i.test(s) && !/\bBEGIN\s+TRY\b/i.test(s)) add('mid', '🧯 Wrap the transaction in BEGIN TRY / BEGIN CATCH with ROLLBACK.');

    const noExists = s.replace(/EXISTS\s*\(\s*SELECT\s+(TOP\s*\(?\d+\)?\s+)?\*/gi, 'EXISTS(SELECT 1');
    if (/\bSELECT\s+(TOP\s*\(?\s*\d+\s*\)?\s+)?(DISTINCT\s+)?\*/i.test(noExists)) add('low', '🎯 List only the columns you need instead of SELECT *.');
    if (/\bSELECT\s+DISTINCT\b/i.test(s)) add('low', '🔍 DISTINCT can hide a JOIN that multiplies rows. Check the joins.');
    if (/\bFROM\s+[\w.[\]]+(\s+(AS\s+)?\w+)?\s*,\s*[\w.[\]]+/i.test(s)) add('low', '🔗 Old-style comma join. Use explicit JOIN … ON (easier to read, fewer accidental cross joins).');
    if (/\bINSERT\s+INTO\s+[\w.[\]#@]+\s+(VALUES|SELECT)\b/i.test(s)) add('low', '🧾 Name the columns in INSERT INTO t (a, b) so schema changes don’t break it.');
    if (/\bORDER\s+BY\s+\d/i.test(s)) add('low', '🔢 ORDER BY 1, 2 (column numbers) breaks silently when the SELECT changes. Use names.');

    return dedupe(out);
  }

  function csharp(text) {
    const out = [];
    const add = (level, msg) => out.push({ level, text: msg });
    const sqlInString = /"[^"\n]*\b(SELECT|INSERT|UPDATE|DELETE)\b[^"\n]*"\s*\+/i.test(text) || /\$@?"[^"\n]*\b(SELECT|INSERT|UPDATE|DELETE)\b[^"\n]*\{/i.test(text);
    if (sqlInString) add('high', '🔐 SQL built with + or $"{…}" can be injected. Use SqlParameter (cmd.Parameters.AddWithValue / Dapper params).');
    if (/(Password|Pwd)\s*=\s*[^;"'\s]{2,}/i.test(text)) add('high', '🔑 A password is hard-coded. Move it to appsettings / user secrets / environment.');
    if (/\.Result\b|\.Wait\(\s*\)/.test(text)) add('mid', '🧊 .Result / .Wait() can deadlock. Use await all the way.');
    if (/catch\s*(\(\s*\w*Exception\s*\w*\s*\))?\s*\{\s*\}/.test(text)) add('mid', '🙈 Empty catch hides errors. At least log the exception.');
    if (/\basync\s+void\s+(?!\w+_(Click|Load|Changed))/.test(text)) add('mid', '⚡ Avoid async void (exceptions get lost). Return Task.');
    if (/new\s+SqlConnection\s*\(/.test(text) && !/using\s*(\(|var\b)[^;]*new\s+SqlConnection/.test(text)) add('mid', '🔌 Wrap SqlConnection in using so it always gets closed.');
    if (/new\s+HttpClient\s*\(/.test(text)) add('low', '🌐 Creating HttpClient every time exhausts sockets. Reuse one (IHttpClientFactory).');
    if (/for(each)?\s*\([^)]*\)[\s\S]{0,200}?\+=\s*["$]/.test(text)) add('low', '🧵 String += in a loop is slow. Use StringBuilder.');

    // also review SQL written inside string literals
    const literals = (text.match(/@?"(?:[^"\\]|\\.|"")*"/g) || []).map((x) => x.replace(/^@?"|"$/g, '')).filter(looksSql);
    for (const lit of literals) for (const r of sql(lit)) out.push({ ...r, text: `In SQL string: ${r.text}` });
    return dedupe(out);
  }

  function dedupe(list) {
    const seen = new Set();
    return list
      .filter((r) => (seen.has(r.text) ? false : seen.add(r.text)))
      .sort((a, b) => ORDER[a.level] - ORDER[b.level]);
  }

  // Picks the right checker for copied text; null if it's not code we understand.
  function review(text) {
    if (!text || text.length < 12 || text.length > 20000) return null;
    if (looksCSharp(text)) return { kind: 'cs', issues: csharp(text) };
    if (looksSql(text)) return { kind: 'sql', issues: sql(text) };
    return null;
  }

  const api = { review, sql, csharp, looksSql, looksCSharp };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CodeCheck = api;
})(typeof window !== 'undefined' ? window : globalThis);
