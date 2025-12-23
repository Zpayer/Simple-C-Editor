// Import the Wails Runtime functions
import * as Runtime from '../wailsjs/runtime/runtime.js';
import * as monaco from 'monaco-editor';
import "monaco-editor/min/vs/editor/editor.main.css";



import { RunCode, NewFile, RunCodeInCMD, OpenFile, SaveFile, SaveFileAs } from '../wailsjs/go/main/App';

const $ = document.querySelector.bind(document);




document.getElementById('min-btn').onclick = () => Runtime.WindowMinimise();
document.getElementById('max-btn').onclick = () => Runtime.WindowToggleMaximise();
document.getElementById('close-btn').onclick = () => Runtime.Quit();



self.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        return './node_modules/monaco-editor/min/vs/base/worker/workerMain.js';
    }
};

const C_LANGUAGE_DATA = {
    keywords: [
        "auto", "break", "case", "char", "const", "continue", "default", "do", "double",
        "else", "enum", "extern", "float", "for", "goto", "if", "inline", "int", "long",
        "register", "restrict", "return", "short", "signed", "sizeof", "static",
        "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while",
        "_Alignas", "_Alignof", "_Atomic", "_Bool", "_Complex", "_Generic",
        "_Imaginary", "_Noreturn", "_Static_assert", "_Thread_local"
    ],

    preprocessor: [
        "#define", "#undef", "#include", "#if", "#ifdef", "#ifndef", "#else",
        "#elif", "#endif", "#error", "#pragma", "#line"
    ],

    types: [
        "size_t", "ptrdiff_t", "FILE", "fpos_t", "time_t", "clock_t",
        "int8_t", "int16_t", "int32_t", "int64_t",
        "uint8_t", "uint16_t", "uint32_t", "uint64_t",
        "intptr_t", "uintptr_t", "wchar_t", "wint_t",
        "bool", "va_list"
    ],

    macros: [
        "NULL", "EOF", "EXIT_SUCCESS", "EXIT_FAILURE",
        "stdin", "stdout", "stderr",
        "RAND_MAX", "MB_CUR_MAX",
        "__FILE__", "__LINE__", "__DATE__", "__TIME__", "__STDC__"
    ],

    functions: [
        "printf", "fprintf", "sprintf", "snprintf", "scanf", "fscanf", "sscanf",
        "putchar", "puts", "getchar", "fgets", "fputs",
        "fopen", "fclose", "fflush", "fread", "fwrite", "fseek", "ftell",
        "malloc", "calloc", "realloc", "free", "exit", "abort",
        "memcpy", "memmove", "memset", "memcmp",
        "strcpy", "strncpy", "strcat", "strcmp", "strlen", "strtok",
        "isdigit", "isalpha", "isalnum", "isspace", "tolower", "toupper",
        "sin", "cos", "tan", "sqrt", "pow", "log", "exp",
        "time", "clock", "localtime", "gmtime"
    ]
};



monaco.languages.registerCompletionItemProvider("c", {
    triggerCharacters: ["#", ".", "(", "<"],
    provideDefinition: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const fileName = model.uri;
        const code = model.getValue();
        const lines = code.split('\n');


        const defRegex = new RegExp(`\\b(int|void|char|float|double|struct)\\s+${word.word}\\b`);

        for (let i = 0; i < lines.length; i++) {
            if (defRegex.test(lines[i])) {
                return {
                    uri: fileName,
                    range: {
                        startLineNumber: i + 1,
                        startColumn: lines[i].indexOf(word.word) + 1,
                        endLineNumber: i + 1,
                        endColumn: lines[i].indexOf(word.word) + word.word.length + 1
                    }
                };
            }
        }
        return null;
    },
    provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
        };

        const suggestions = [];

        for (const kw of C_LANGUAGE_DATA.keywords) {
            suggestions.push({
                label: kw,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: kw,
                range
            });
        }

        for (const type of C_LANGUAGE_DATA.types) {
            suggestions.push({
                label: type,
                kind: monaco.languages.CompletionItemKind.TypeParameter,
                insertText: type,
                range
            });
        }

        for (const macro of C_LANGUAGE_DATA.macros) {
            suggestions.push({
                label: macro,
                kind: monaco.languages.CompletionItemKind.Constant,
                insertText: macro,
                range
            });
        }

        for (const pp of C_LANGUAGE_DATA.preprocessor) {
            suggestions.push({
                label: pp,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: pp,
                range
            });
        }

        for (const fn of C_LANGUAGE_DATA.functions) {
            suggestions.push({
                label: fn,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: `${fn}($0)`,
                insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range
            });
        }

        const code = model.getValue();
        const functionRegex = /\b(?:int|void|char|float|double)\s+([a-zA-Z_]\w*)\s*\(/g;
        let match;
        const seen = new Set();

        while ((match = functionRegex.exec(code)) !== null) {
            const funcName = match[1];
            if (funcName !== 'main' && !seen.has(funcName)) {
                suggestions.push({
                    label: funcName,
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: `${funcName}($0)`,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Local Function',
                    documentation: 'User defined function in this file'
                });
                seen.add(funcName);
            }
        }

        const varRegex = /\b(?:int|char|float|double)\s+([a-zA-Z_]\w*)\s*[\s;=]/g;
        while ((match = varRegex.exec(code)) !== null) {
            const varName = match[1];
            if (!seen.has(varName)) {
                suggestions.push({
                    label: varName,
                    kind: monaco.languages.CompletionItemKind.Variable,
                    insertText: varName,
                    detail: 'Local Variable'
                });
                seen.add(varName);
            }
        }

        return { suggestions };
    }
});


monaco.editor.defineTheme('transparent-theme', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
        'editor.background': '#00000000',
        'editorGutter.background': '#00000000',
        'minimap.background': '#ffffff10',
        'minimap.selectionHighlight': '#ffffff33',
        'minimapSlider.background': '#ffffff11',
    }
});




const colors = {
    success: '#52f970',
    error: '#f95252',
}
const body = {
    output: $('#output'),
    settings: $('#settings'),
    newFileBtn: $('#new-file-btn'),
    importBtn: $('#import-btn'),
    saveBtn: $('#save-btn'),
    runBtn: $('#run-btn'),
    settingsBtn: $('#settings-btn'),
}
function getFormattedTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');

    return `[${hours}:${mins}:${secs}]`;
};
function toolTip(element, message) {
    function AddToolTip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.innerText = message;

        tooltip.style.cssText = `
        position: absolute;
        background: #00000000;
        border-radius: calc(var(--border-rad) - 4px);
        height: 20px;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
        backdrop-filter: blur(30px);
        pointer-events: none;
        z-index: 9999;
    `;

        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        const margin = 8;

        let left = rect.left + (rect.width - tooltip.offsetWidth) / 2;
        let top = rect.top - tooltip.offsetHeight - margin;


        const maxLeft = window.innerWidth - tooltip.offsetWidth - margin;
        left = Math.max(margin, Math.min(left, maxLeft));


        if (top < margin) {
            top = rect.bottom + margin;
        }

        const maxTop = window.innerHeight - tooltip.offsetHeight - margin;
        top = Math.max(margin, Math.min(top, maxTop));

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;

        return tooltip;
    }
    element.addEventListener('mouseenter', (e) => {
        if (element._tooltip) return;
        const tooltip = AddToolTip(element, 'Save (Ctrl+S)');
        element._tooltip = tooltip;
    });
    element.addEventListener('mouseleave', (e) => {
        if (element._tooltip) element._tooltip = element._tooltip.remove();

    });
}

toolTip(body.saveBtn, 'Save (Ctrl+S)');
toolTip(body.importBtn, 'Open File');
toolTip(body.newFileBtn, 'New File');
toolTip(body.runBtn, 'Run Code');
toolTip(body.settingsBtn, 'Settings');





async function runCMD() {
    const code = window.editor.getValue();
    console.log("Running code in CMD:\n", code);

    try {
        const result = await RunCodeInCMD(code);
        if (result === "success") {
            body.output.innerHTML += `<span style="color: ${colors.success}; font-size: 12px;">${getFormattedTime()}: Successful execution.\n</span>`;
            console.log(`${getFormattedTime()}: Successful execution.`);
        } else {
            body.output.innerHTML += `<span style="color: ${colors.error}; font-size: 12px;">${getFormattedTime()}: Execution failed: \n ${result}\n</span>`;
            console.log(`${getFormattedTime()}: Execution failed: `, result);

        }
        body.output.scrollTop = body.output.scrollHeight;
    } catch (err) {
        console.error("Execution failed: ", err);
    }
}



document.fonts.ready.then(function () {
    const editor = monaco.editor.create(document.getElementById('content'), {
        value: '#include <stdio.h>\n\nint main() {\n    return 0;\n}',
        language: 'c',
        theme: 'transparent-theme',
        automaticLayout: true,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Fira Code, monospace',
        fontLigatures: true,
        formatOnType: true, 
        formatOnPaste: true,
        autoIndent: "full",
        tabSize: 4,
        insertSpaces: true,
        minimap: {
            enabled: true,
            renderCharacters: false,
            maxColumn: 200,
        }
    });
    window.editor = editor;


    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
        const content = editor.getValue();
        const result = await SaveFile(content);
        console.log(result);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, async () => {
        const content = editor.getValue();
        await SaveFileAs(content);
    });

    body.newFileBtn.addEventListener('click', async () => {
        await NewFile();
        editor.setValue("#include <stdio.h>\n\nint main() {\n    return 0;\n}");
        console.log("Path reset. Next save will ask for a name.");
    });

    body.importBtn.addEventListener('click', async () => {
        editor.setValue(await OpenFile());
    });

    body.saveBtn.addEventListener('click', async () => {
        const content = editor.getValue();
        const result = await SaveFile(content);
        console.log(result);
    });

    body.runBtn.addEventListener('click', async () => {
        await runCMD();
    });
    body.settingsBtn.addEventListener('click', async () => {
        if (body.settings.style.display === 'none') {
            editor.updateOptions({ minimap: { enabled: false } });
            body.settings.style.display = 'flex';
        } else {
            editor.updateOptions({ minimap: { enabled: true } });
            body.settings.style.display = 'none';
        }
    });

});