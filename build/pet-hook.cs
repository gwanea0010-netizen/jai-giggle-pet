// Claude Code hook -> pet bridge for installs without Node.js.
// Reads the hook JSON from stdin, keeps only the fields the pet needs and POSTs them
// to the pet's local server. Starts the pet if it isn't running. Always exits 0, prints nothing.
using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

static class PetHook
{
    static readonly string[] Fields = { "hook_event_name", "session_id", "cwd", "tool_name", "message" };

    static int Main()
    {
        // Never hold up Claude Code.
        new Thread(() => { Thread.Sleep(4500); Environment.Exit(0); }) { IsBackground = true }.Start();
        try
        {
            string input;
            using (var stdin = Console.OpenStandardInput())
            using (var reader = new StreamReader(stdin, new UTF8Encoding(false)))
                input = reader.ReadToEnd();

            int port = 47321;
            int envPort;
            if (int.TryParse(Environment.GetEnvironmentVariable("GIGGLES_PORT"), out envPort)) port = envPort;

            var body = new StringBuilder("{");
            foreach (var key in Fields)
            {
                var m = Regex.Match(input, "\"" + key + "\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
                if (!m.Success) continue;
                if (body.Length > 1) body.Append(',');
                body.Append('"').Append(key).Append("\":\"").Append(m.Groups[1].Value).Append('"');
            }
            body.Append('}');
            string json = body.ToString();
            string ev = Regex.Match(json, "\"hook_event_name\":\"([^\"]*)\"").Groups[1].Value;

            if (!Post(port, json) && (ev == "SessionStart" || ev == "UserPromptSubmit")
                && Environment.GetEnvironmentVariable("GIGGLES_AUTOLAUNCH") != "0")
            {
                // pet-hook.exe lives in <install>\resources\, the app in <install>\
                string resources = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
                string exe = Path.Combine(Path.GetDirectoryName(resources), "Giggles Pet.exe");
                if (File.Exists(exe))
                {
                    Process.Start(new ProcessStartInfo(exe) { UseShellExecute = true });
                    for (int i = 0; i < 8 && !Post(port, json); i++) Thread.Sleep(400);
                }
            }
        }
        catch { }
        return 0;
    }

    static bool Post(int port, string json)
    {
        try
        {
            var req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/event");
            req.Method = "POST";
            req.ContentType = "application/json";
            req.Timeout = 800;
            req.Proxy = null;
            var bytes = Encoding.UTF8.GetBytes(json);
            req.ContentLength = bytes.Length;
            using (var s = req.GetRequestStream()) s.Write(bytes, 0, bytes.Length);
            using (req.GetResponse()) { }
            return true;
        }
        catch { return false; }
    }
}
