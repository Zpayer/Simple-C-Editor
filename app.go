package main

import (
	"context"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx            context.Context
	openedFilePath string
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) NewFile() {
	a.openedFilePath = ""
}

func (a *App) OpenFile() string {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Open C File",
	})
	if err != nil || selection == "" {
		return ""
	}

	a.openedFilePath = selection
	data, _ := os.ReadFile(selection)
	return string(data)
}

func (a *App) SaveFile(content string) string {
	if a.openedFilePath == "" {
		selection, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
			Title:           "Save New C File",
			DefaultFilename: "main.c",
			Filters: []runtime.FileFilter{
				{DisplayName: "C Files (*.c)", Pattern: "*.c"},
			},
		})

		if err != nil || selection == "" {
			return "Save cancelled"
		}

		a.openedFilePath = selection
	}

	err := os.WriteFile(a.openedFilePath, []byte(content), 0644)
	if err != nil {
		return "Error: " + err.Error()
	}
	return "Saved successfully!"
}

func (a *App) SaveFileAs(content string) string {
	selection, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save As...",
		DefaultFilename: "main.c",
	})
	if err != nil || selection == "" {
		return ""
	}

	a.openedFilePath = selection
	os.WriteFile(selection, []byte(content), 0644)
	return "Saved to " + selection
}
func (a *App) RunCode(code string) string {
	exePath, _ := os.Executable()
	baseDir := filepath.Dir(exePath)

	tccPath := filepath.Join(baseDir, "tcc", "tcc.exe")
	log.Println("Base Directory:", tccPath)

	tempFile := filepath.Join(os.TempDir(), "temp_code.c")
	err := os.WriteFile(tempFile, []byte(code), 0644)
	if err != nil {
		return "System Error: Could not write code to disk."
	}
	defer os.Remove(tempFile)

	includePath := "-I" + filepath.Join(baseDir, "bin", "tcc", "include")
	cmd := exec.Command(tccPath, includePath, "-run", tempFile)

	out, err := cmd.CombinedOutput()
	if err != nil {
		if len(out) == 0 {
			return "System Error: TCC failed to start. Check if " + tccPath + " exists."
		}
		return "COMPILE ERROR:\n" + string(out)
	}

	return string(out)
}
func (a *App) RunCodeInCMD(code string) string {
	exePath, _ := os.Executable()
	baseDir := filepath.Dir(exePath)
	tccPath := filepath.Join(baseDir, "tcc", "tcc.exe")

	tempC := filepath.Join(os.TempDir(), "temp_code.c")
	outputExe := filepath.Join(os.TempDir(), "output_prog.exe")

	os.WriteFile(tempC, []byte(code), 0644)

	includePath := "-I" + filepath.Join(baseDir, "bin", "tcc", "include")
	libPath := "-L" + filepath.Join(baseDir, "bin", "tcc", "lib")

	compileCmd := exec.Command(tccPath, tempC, "-o", outputExe, includePath, libPath)
	out, err := compileCmd.CombinedOutput()

	if err != nil {
		return "COMPILE ERROR:\n" + string(out)
	}

	runCmd := exec.Command("cmd.exe", "/C", "start", "cmd.exe", "/K", outputExe)
	err = runCmd.Run()

	if err != nil {
		return err.Error()
	}

	return "success"
}
