import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
  const tasksFile = path.join(rootPath, 'tasks.json');

  context.subscriptions.push(vscode.commands.registerCommand('taskManager.open', () => {
    const panel = vscode.window.createWebviewPanel(
      'taskManager',
      'Task Management',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    function loadTasks() {
      if (fs.existsSync(tasksFile)) {
        return JSON.parse(fs.readFileSync(tasksFile, 'utf-8')).tasks;
      }
      return [];
    }

    let tasks = loadTasks();
    panel.webview.html = getWebviewContent(tasks);

    panel.webview.onDidReceiveMessage(message => {
      if (message.command === 'addTask') {
        tasks.push({ title: message.title, done: false });
      } else if (message.command === 'toggleTask') {
        tasks[message.index].done = !tasks[message.index].done;
      }
      fs.writeFileSync(tasksFile, JSON.stringify({ tasks }, null, 2));
      panel.webview.html = getWebviewContent(tasks);
    });
  }));
}

function getWebviewContent(tasks: any[]): string {
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <body>
      <h2>📌 Task Management</h2>
      <ul>
        ${tasks.map((t, i) =>
          `<li>
            <button onclick="toggleTask(${i})">${t.done ? "✅" : "⬜"}</button>
            ${t.title}
          </li>`
        ).join('')}
      </ul>
      <input id="taskInput" placeholder="New Task">
      <button onclick="addTask()">Add</button>

      <script>
        const vscode = acquireVsCodeApi();
        function addTask() {
          const input = document.getElementById('taskInput');
          if (input.value.trim() !== '') {
            vscode.postMessage({ command: 'addTask', title: input.value });
            input.value = '';
          }
        }
        function toggleTask(index) {
          vscode.postMessage({ command: 'toggleTask', index });
        }
      </script>
    </body>
    </html>`;
}