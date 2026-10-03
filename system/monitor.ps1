# Prints one JSON line every ~1.5s describing what the PC is doing:
#   peak   - current output audio level (0..1) of the default speakers/headphones
#   mic    - true while any app is using the microphone (calls, voice typing)
#   fgProc - process name of the foreground window, fgTitle - its title
#   media  - title of a browser/Spotify window that looks like music or video
# Everything stays on this machine; the pet only reads it from stdout.

$ErrorActionPreference = 'SilentlyContinue'

Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Diagnostics;
using System.Runtime.InteropServices;

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorCom {}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int NotUsed_EnumAudioEndpoints();
  [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  [PreserveSig] int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
}

[Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioMeterInformation {
  [PreserveSig] int GetPeakValue(out float peak);
}

public static class PetSys {
  static IAudioMeterInformation meter;
  static int uses;

  public static float Peak() {
    try {
      // Re-acquire now and then so a changed default device is picked up.
      if (meter == null || ++uses > 40) {
        uses = 0;
        var en = (IMMDeviceEnumerator)(new MMDeviceEnumeratorCom());
        IMMDevice dev;
        if (en.GetDefaultAudioEndpoint(0, 1, out dev) != 0) return 0;
        Guid iid = typeof(IAudioMeterInformation).GUID;
        object o;
        dev.Activate(ref iid, 23, IntPtr.Zero, out o);
        meter = (IAudioMeterInformation)o;
      }
      float p;
      meter.GetPeakValue(out p);
      return p;
    } catch { meter = null; return 0; }
  }

  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);

  public static string[] Foreground() {
    try {
      IntPtr h = GetForegroundWindow();
      var sb = new StringBuilder(512);
      GetWindowText(h, sb, sb.Capacity);
      uint pid;
      GetWindowThreadProcessId(h, out pid);
      string name = Process.GetProcessById((int)pid).ProcessName;
      return new string[] { name, sb.ToString(), h.ToInt64().ToString() };
    } catch { return new string[] { "", "", "0" }; }
  }
}
"@

$browsers = @('chrome', 'msedge', 'firefox', 'brave', 'opera', 'vivaldi')
$mediaRx = 'YouTube|Spotify|SoundCloud|JioSaavn|Gaana|Wynk|Apple Music|Amazon Music|Gaana|Hungama'
$micRoot = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone'

function Test-MicInUse {
  foreach ($root in @($micRoot, "$micRoot\NonPackaged")) {
    foreach ($key in (Get-ChildItem $root)) {
      $p = Get-ItemProperty $key.PSPath
      if ($p.LastUsedTimeStart -gt 0 -and $p.LastUsedTimeStop -eq 0) { return $true }
    }
  }
  return $false
}

# Address bar of the foreground Chrome/Edge window, only when the pet asks for it
# (GIGGLES_WANT_URL=1 while the password vault is unlocked). Read via UI Automation.
$wantUrl = $env:GIGGLES_WANT_URL -eq '1'
if ($wantUrl) { Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes }
$urlCache = @{ hwnd = '0'; el = $null }
function Get-BrowserUrl([string]$hwnd) {
  try {
    if ($urlCache.hwnd -ne $hwnd -or -not $urlCache.el) {
      $root = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr][long]$hwnd)
      $cond = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Edit)
      $urlCache.el = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
      $urlCache.hwnd = $hwnd
    }
    if ($urlCache.el) {
      $vp = $urlCache.el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
      return [string]$vp.Current.Value
    }
  } catch { $urlCache.el = $null }
  return ''
}

$tick = 0
$media = ''
while ($true) {
  $peak = [PetSys]::Peak()
  $fg = [PetSys]::Foreground()
  $mic = Test-MicInUse
  $url = ''
  if ($wantUrl -and @('chrome', 'msedge') -contains $fg[0].ToLower()) { $url = Get-BrowserUrl $fg[2] }

  if ($tick % 3 -eq 0) {
    $media = ''
    $procs = Get-Process -Name ($browsers + 'Spotify') | Where-Object { $_.MainWindowTitle }
    foreach ($p in $procs) {
      $t = $p.MainWindowTitle
      if ($p.ProcessName -eq 'Spotify' -and $t -notmatch '^Spotify') { $media = $t; break }
      if ($t -match $mediaRx) { $media = $t; break }
    }
  }

  $line = @{ peak = [math]::Round($peak, 3); mic = $mic; fgProc = $fg[0]; fgTitle = $fg[1]; media = $media; url = $url } | ConvertTo-Json -Compress
  [Console]::Out.WriteLine($line)
  [Console]::Out.Flush()
  $tick++
  Start-Sleep -Milliseconds 1500
}
