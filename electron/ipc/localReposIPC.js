import { pathReader } from "../utils/pathReader.js";
import { spawn } from "node:child_process";
import { ipcMain } from "electron";
import { openInVSCode } from "../utils/commands.js";

export default function ReposIPCInit() {
  ipcMain.handle("get-repos", async () => {
    return pathReader("/home/mathieulp/Documents/mathieu");
  });

  ipcMain.on("open-vscode", (_, folderPath) => {
    openInVSCode(folderPath);
  });

  ipcMain.on("launch-app", (_, payload) => {
    const { path: repoPath, commands } = payload;
    if (!Array.isArray(commands) || commands.length === 0 || !repoPath) return;

    const escaped = commands.filter(Boolean).map((c) => c.replace(/"/g, '\\"'));

    const cases = escaped
      .map(
        (cmd) => `
echo "----------------------------------------"
echo "$ ${cmd}"
${cmd}
status=$?
if [ $status -eq 0 ]; then
  echo ""
  echo "✅ Succès avec : ${cmd}"
  break
else
  echo ""
  echo "❌ Échec (exit=$status), essai de la commande suivante..."
fi
`
      )
      .join("\n");

    const runCmd = `
cd "${repoPath}" || exit 1
echo "📁 Dossier : $(pwd)"
echo "💡 Essai des commandes possibles :"
echo ""
${cases}
echo ""
echo "=============================="
echo "Fin des essais de lancement."
echo "Tu peux continuer à utiliser ce terminal."
echo "=============================="
exec "$SHELL"
`;

    spawn("kitty", ["sh", "-c", runCmd], {
      detached: true,
      stdio: "ignore",
    }).unref();
  });
}
