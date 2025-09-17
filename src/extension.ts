import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || "";
  const tasksFile = path.join(rootPath, "tasks.json");

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = "✔ Task Manager";
  statusBarItem.command = "taskManager.open";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand("taskManager.open", () => {
      const panel = vscode.window.createWebviewPanel(
        "taskManager",
        "Task Management",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      function loadTasks() {
        if (fs.existsSync(tasksFile)) {
          return JSON.parse(fs.readFileSync(tasksFile, "utf-8")).tasks;
        }
        return [];
      }

      let tasks = loadTasks();
      panel.webview.html = getWebviewContent(tasks);

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "addTask") {
          tasks.push({ title: message.title, done: false });
        } else if (message.command === "toggleTask") {
          tasks[message.index].done = !tasks[message.index].done;
        } else if (message.command === "editTask") {
          await vscode.commands.executeCommand("taskManager.editTask", message.index);
        } else if (message.command === "deleteTask") {
          await vscode.commands.executeCommand("taskManager.deleteTask", message.index);
        }
        fs.writeFileSync(tasksFile, JSON.stringify({ tasks }, null, 2));
        panel.webview.html = getWebviewContent(tasks);
      });

      context.subscriptions.push(
        vscode.commands.registerCommand("taskManager.editTask", async (index: number) => {
          const newTitle = await vscode.window.showInputBox({
            prompt: "Enter new task title",
            value: tasks[index]?.title || "",
          });
          if (newTitle) {
            tasks[index].title = newTitle;
            fs.writeFileSync(tasksFile, JSON.stringify({ tasks }, null, 2));
            panel.webview.html = getWebviewContent(tasks);
          }
        })
      );

      context.subscriptions.push(
        vscode.commands.registerCommand("taskManager.deleteTask", (index: number) => {
          tasks.splice(index, 1);
          fs.writeFileSync(tasksFile, JSON.stringify({ tasks }, null, 2));
          panel.webview.html = getWebviewContent(tasks);
        })
      );
    })
  );
}

function getWebviewContent(tasks: any[]): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <style>
        body {
          font-family: "Segoe UI", sans-serif;
          padding: 20px;
          background: linear-gradient(135deg, #1e1e2f, #121212);
          color: #fff;
        }
        h2 {
          text-align: center;
          color: #fff;
          margin-bottom: 16px;
        }
        ul {
          list-style: none;
          padding: 0;
        }
        li {
          backdrop-filter: blur(12px) saturate(180%);
          -webkit-backdrop-filter: blur(12px) saturate(180%);
          background-color: rgba(40, 40, 40, 0.5);
          margin: 10px 0;
          padding: 12px 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
        }
        .task-title {
          flex: 1;
          margin-left: 10px;
          font-size: 15px;
        }
        .done {
          text-decoration: line-through;
          opacity: 0.6;
        }
        button {
          border: none;
          cursor: pointer;
          margin-left: 6px;
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 14px;
          background: rgba(255,255,255,0.1);
          color: white;
          transition: background 0.2s;
        }
        button:hover {
          background: rgba(255,255,255,0.25);
        }
        #taskInput {
          width: 70%;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.1);
          color: white;
        }
        #taskInput::placeholder {
          color: rgba(255,255,255,0.5);
        }
        #addBtn {
          padding: 8px 14px;
          margin-left: 10px;
          background: rgba(0,120,212,0.7);
          color: white;
          border-radius: 8px;
        }
        #addBtn:hover {
          background: rgba(0,120,212,1);
        }
      </style>
    </head>
    <body>
      <h2>✔ Task Management</h2>
      <ul>
        ${tasks.map((t, i) =>
          `<li>
            <button onclick="toggleTask(${i})">${t.done ? "✅" : "⬜"}</button>
            <span class="task-title ${t.done ? "done" : ""}">${t.title}</span>
            <button onclick="editTask(${i})">✏️</button>
            <button onclick="deleteTask(${i})">🗑</button>
          </li>`
        ).join("")}
      </ul>
      <div style="margin-top:16px; text-align:center;">
        <input id="taskInput" placeholder="New Task">
        <button id="addBtn" onclick="addTask()">Add</button>
      </div>

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
        function editTask(index) {
          vscode.postMessage({ command: 'editTask', index });
        }
        function deleteTask(index) {
          vscode.postMessage({ command: 'deleteTask', index });
        }
      </script>
    </body>
    </html>`;
}

export function deactivate() {}
