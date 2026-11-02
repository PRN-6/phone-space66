using System;
using System.IO;
using System.Diagnostics;
using System.Net;
using System.Threading;
using System.Reflection;

[assembly: AssemblyTitle("PHONE SPACE66")]
[assembly: AssemblyProduct("PHONE SPACE66 Desktop")]
[assembly: AssemblyDescription("Your Phone. Your Space. Your Desktop.")]
[assembly: AssemblyCompany("PHONE SPACE66")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace PhoneSpace66
{
    static class Program
    {
        private static HttpListener listener;
        private static Process bridgeProcess;
        private static bool isRunning = true;
        private const int Port = 1420;

        [STAThread]
        static void Main()
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string distDir = Path.Combine(appDir, "desktop", "dist");
            if (!Directory.Exists(distDir))
            {
                distDir = Path.Combine(appDir, "dist");
            }

            // 0. Kill any dangling previous bridge on 6655/6656
            KillOldBridgeProcesses();

            // 1. Start USB MTP Hardware Bridge
            StartBridge(appDir);

            // 2. Start Embedded Static Web Server
            if (Directory.Exists(distDir))
            {
                StartHttpServer(distDir);
            }

            // 3. Launch App Window in Edge App Mode
            LaunchAppWindow();

            // Cleanup when window exits
            Cleanup();
        }

        static void StartBridge(string appDir)
        {
            try
            {
                string bridgeScript = Path.Combine(appDir, "scripts", "usb_mtp_bridge.cjs");
                if (File.Exists(bridgeScript))
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = "node",
                        Arguments = "\"" + bridgeScript + "\"",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        WorkingDirectory = appDir
                    };
                    bridgeProcess = Process.Start(psi);
                }
            }
            catch (Exception) { }
        }

        static void StartHttpServer(string distDir)
        {
            try
            {
                listener = new HttpListener();
                listener.Prefixes.Add("http://127.0.0.1:" + Port + "/");
                listener.Prefixes.Add("http://localhost:" + Port + "/");
                listener.Start();

                Thread serverThread = new Thread(() =>
                {
                    while (isRunning)
                    {
                        try
                        {
                            HttpListenerContext ctx = listener.GetContext();
                            ThreadPool.QueueUserWorkItem((_) => ProcessRequest(ctx, distDir));
                        }
                        catch
                        {
                            if (!isRunning) break;
                        }
                    }
                });
                serverThread.IsBackground = true;
                serverThread.Start();
            }
            catch (Exception) { }
        }

        static void ProcessRequest(HttpListenerContext ctx, string distDir)
        {
            try
            {
                string rawUrl = ctx.Request.Url.AbsolutePath.TrimStart('/');
                if (string.IsNullOrEmpty(rawUrl)) rawUrl = "index.html";

                string filePath = Path.Combine(distDir, rawUrl.Replace('/', Path.DirectorySeparatorChar));

                if (!File.Exists(filePath))
                {
                    // SPA Fallback to index.html
                    filePath = Path.Combine(distDir, "index.html");
                }

                byte[] bytes = File.ReadAllBytes(filePath);
                string ext = Path.GetExtension(filePath).ToLower();
                string contentType = "text/html";

                if (ext == ".js") contentType = "application/javascript";
                else if (ext == ".css") contentType = "text/css";
                else if (ext == ".svg") contentType = "image/svg+xml";
                else if (ext == ".png") contentType = "image/png";
                else if (ext == ".ico") contentType = "image/x-icon";
                else if (ext == ".json") contentType = "application/json";

                ctx.Response.ContentType = contentType;
                ctx.Response.ContentLength64 = bytes.Length;
                ctx.Response.AddHeader("Access-Control-Allow-Origin", "*");
                ctx.Response.OutputStream.Write(bytes, 0, bytes.Length);
                ctx.Response.OutputStream.Close();
            }
            catch
            {
                try { ctx.Response.StatusCode = 404; ctx.Response.Close(); } catch { }
            }
        }

        static void LaunchAppWindow()
        {
            string url = "http://localhost:" + Port;
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath))
            {
                edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }

            string dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PhoneSpace66", "AppData");

            ProcessStartInfo psi;
            if (File.Exists(edgePath))
            {
                psi = new ProcessStartInfo
                {
                    FileName = edgePath,
                    Arguments = "--app=\"" + url + "\" --window-size=1440,900 --user-data-dir=\"" + dataDir + "\"",
                    UseShellExecute = false
                };
            }
            else
            {
                psi = new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                };
            }

            Process appProc = Process.Start(psi);
            if (appProc != null)
            {
                appProc.WaitForExit();
            }
        }

        static void Cleanup()
        {
            isRunning = false;
            try
            {
                if (listener != null && listener.IsListening)
                {
                    listener.Stop();
                    listener.Close();
                }
            }
            catch { }

            try
            {
                if (bridgeProcess != null && !bridgeProcess.HasExited)
                {
                    bridgeProcess.Kill();
                }
            }
            catch { }
        }

        static void KillOldBridgeProcesses()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "powershell",
                    Arguments = "-NoProfile -Command \"Get-NetTCPConnection -LocalPort 6655,6656 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }\"",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                Process p = Process.Start(psi);
                if (p != null) p.WaitForExit(3000);
            }
            catch { }
        }
    }
}

