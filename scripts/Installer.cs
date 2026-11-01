using System;
using System.IO;
using System.Diagnostics;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("PHONE SPACE66 Setup")]
[assembly: AssemblyProduct("PHONE SPACE66 Setup")]
[assembly: AssemblyDescription("PHONE SPACE66 Desktop Installer")]
[assembly: AssemblyCompany("PHONE SPACE66")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace PhoneSpace66Installer
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string currentDir = AppDomain.CurrentDomain.BaseDirectory;
            string installDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "PHONE SPACE66");

            DialogResult res = MessageBox.Show(
                "Welcome to PHONE SPACE66 Setup!\n\n\"Your Phone. Your Space. Your Desktop.\"\n\nInstall PHONE SPACE66 to:\n" + installDir + "\n\nClick OK to install.",
                "PHONE SPACE66 Setup",
                MessageBoxButtons.OKCancel,
                MessageBoxIcon.Information
            );

            if (res != DialogResult.OK) return;

            try
            {
                Directory.CreateDirectory(installDir);

                // Copy executable
                string sourceExe = Path.Combine(currentDir, "PHONE SPACE66.exe");
                if (File.Exists(sourceExe))
                {
                    File.Copy(sourceExe, Path.Combine(installDir, "PHONE SPACE66.exe"), true);
                }

                // Copy scripts
                string scriptsDir = Path.Combine(currentDir, "scripts");
                if (Directory.Exists(scriptsDir))
                {
                    CopyDirectory(scriptsDir, Path.Combine(installDir, "scripts"));
                }

                // Copy desktop dist
                string distDir = Path.Combine(currentDir, "desktop", "dist");
                if (Directory.Exists(distDir))
                {
                    CopyDirectory(distDir, Path.Combine(installDir, "desktop", "dist"));
                }

                // Create Desktop Shortcut via WScript.Shell COM
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutPath = Path.Combine(desktopPath, "PHONE SPACE66.lnk");
                CreateShortcut(shortcutPath, Path.Combine(installDir, "PHONE SPACE66.exe"), "PHONE SPACE66 - Virtual Desktop for Android");

                // Create Start Menu Shortcut
                string startMenuPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs");
                CreateShortcut(Path.Combine(startMenuPath, "PHONE SPACE66.lnk"), Path.Combine(installDir, "PHONE SPACE66.exe"), "PHONE SPACE66");

                MessageBox.Show(
                    "PHONE SPACE66 has been installed successfully!\n\nA shortcut has been created on your Desktop.",
                    "Installation Complete",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );

                // Launch newly installed application
                Process.Start(Path.Combine(installDir, "PHONE SPACE66.exe"));
            }
            catch (Exception ex)
            {
                MessageBox.Show("Installation error: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static void CopyDirectory(string sourceDir, string targetDir)
        {
            Directory.CreateDirectory(targetDir);
            foreach (string file in Directory.GetFiles(sourceDir))
            {
                File.Copy(file, Path.Combine(targetDir, Path.GetFileName(file)), true);
            }
            foreach (string sub in Directory.GetDirectories(sourceDir))
            {
                CopyDirectory(sub, Path.Combine(targetDir, Path.GetFileName(sub)));
            }
        }

        static void CreateShortcut(string shortcutPath, string targetPath, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetPath;
                    shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath);
                    shortcut.Description = description;
                    shortcut.Save();
                }
            }
            catch { }
        }
    }
}

