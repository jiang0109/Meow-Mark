// 阻止 Windows 在 release 构建中额外弹出命令行窗口。
// dev 构建（`tauri dev`）仍然是控制台程序，方便在终端里看日志。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    markdown_hub_lib::run();
}
