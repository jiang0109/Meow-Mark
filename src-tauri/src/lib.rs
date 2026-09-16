use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Note {
    id: String,
    title: String,
    content: String,
    file_path: String,
    updated_at: u64,
}

fn root(directory: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(directory);
    if !path.is_dir() {
        return Err("所选路径不是有效目录".into());
    }
    path.canonicalize().map_err(|e| e.to_string())
}

fn checked_file(directory: &str, file_path: &str) -> Result<PathBuf, String> {
    let root = root(directory)?;
    let file = PathBuf::from(file_path);
    let parent = file
        .parent()
        .ok_or("文件路径无效")?
        .canonicalize()
        .map_err(|e| e.to_string())?;
    if parent != root
        || file
            .extension()
            .and_then(|v| v.to_str())
            .map(|v| v.eq_ignore_ascii_case("md"))
            != Some(true)
    {
        return Err("只能操作所选目录内的 Markdown 文件".into());
    }
    Ok(file)
}

fn note_from_path(path: &Path) -> Result<Note, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let updated_at = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let canonical = path.canonicalize().map_err(|e| e.to_string())?;
    let canonical_text = canonical.to_string_lossy().into_owned();
    Ok(Note {
        id: canonical_text.clone(),
        title: path
            .file_stem()
            .and_then(|v| v.to_str())
            .unwrap_or("无标题笔记")
            .to_string(),
        content: fs::read_to_string(path).map_err(|e| e.to_string())?,
        file_path: canonical_text,
        updated_at,
    })
}

fn clean_title(title: &str) -> String {
    let cleaned: String = title
        .trim()
        .chars()
        .map(|c| {
            if "\\/:*?\"<>|".contains(c) || c.is_control() {
                '_'
            } else {
                c
            }
        })
        .take(100)
        .collect();
    let cleaned = cleaned.trim_end_matches(['.', ' ']);
    if cleaned.is_empty() {
        "无标题笔记".into()
    } else {
        cleaned.into()
    }
}

fn unique_path(root: &Path, title: &str, current: Option<&Path>) -> PathBuf {
    let title = clean_title(title);
    for index in 0..10_000 {
        let name = if index == 0 {
            title.clone()
        } else {
            format!("{} ({})", title, index + 1)
        };
        let candidate = root.join(format!("{name}.md"));
        if !candidate.exists() || current == Some(candidate.as_path()) {
            return candidate;
        }
    }
    root.join(format!("{}-{}.md", title, std::process::id()))
}

#[tauri::command]
fn list_notes(directory: String) -> Result<Vec<Note>, String> {
    let mut notes = fs::read_dir(root(&directory)?)
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| {
            p.is_file()
                && p.extension()
                    .and_then(|v| v.to_str())
                    .map(|v| v.eq_ignore_ascii_case("md"))
                    == Some(true)
        })
        .filter_map(|p| note_from_path(&p).ok())
        .collect::<Vec<_>>();
    notes.sort_by_key(|a| std::cmp::Reverse(a.updated_at));
    Ok(notes)
}

#[tauri::command]
fn create_note(directory: String) -> Result<Note, String> {
    let root = root(&directory)?;
    let path = unique_path(&root, "无标题笔记", None);
    fs::write(&path, "# 无标题笔记\n").map_err(|e| e.to_string())?;
    note_from_path(&path)
}

#[tauri::command]
fn save_note(directory: String, note: Note) -> Result<Note, String> {
    let root = root(&directory)?;
    let old = checked_file(&directory, &note.file_path)?;
    let target = unique_path(&root, &note.title, Some(&old));
    if target != old {
        fs::rename(&old, &target).map_err(|e| e.to_string())?;
    }
    fs::write(&target, note.content.as_bytes()).map_err(|e| e.to_string())?;
    note_from_path(&target)
}

#[tauri::command]
fn delete_note(directory: String, file_path: String) -> Result<(), String> {
    fs::remove_file(checked_file(&directory, &file_path)?).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_notes,
            create_note,
            save_note,
            delete_note
        ])
        .run(tauri::generate_context!())
        .expect("error while running Markdown Hub");
}
