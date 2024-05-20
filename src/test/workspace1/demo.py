import json
import os
from urllib import request
from time import sleep


def post_data(data):
    port = os.environ.get("REMOTE_CONTROL_PORT", "37100")
    url = f"http://localhost:{port}"
    body = json.dumps(data).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    req = request.Request(url, body, headers)
    res = request.urlopen(req)
    return res.read().decode()


this_dir = os.path.dirname(os.path.abspath(__file__))
sequence = [
    {"command": "workbench.action.terminal.new"},
    {"command": "custom.runInTerminal", "args": ["ls -la", "date"]},
    {"command": "workbench.action.terminal.killAll"},
    {"command": "custom.goToFileLineCharacter", "args": ["demo.py", 0, 0]},
    {"command": "custom.goToFileLineCharacter", "args": ["demo.py", 37, 19]},
    {
        "command": "custom.startDebugSession",
        "args": [
            "${workspaceFolder}",
            {
                "name": "Run sample.py",
                "type": "python",
                "request": "launch",
                "program": "demo.py",
                "console": "integratedTerminal",
                "justMyCode": True,
            },
        ],
    },
]

for cmd in sequence:
    print(f"Executing: <{cmd['command']}> ...")
    print(post_data(cmd))
    sleep(5.0 if cmd["command"] == "vscode.openFolder" else 2.5)
