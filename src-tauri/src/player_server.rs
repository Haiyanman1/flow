//! A deliberately tiny loopback HTTP server serving two things: the YouTube
//! background player page, and background images the user has imported.
//!
//! Why this exists: on macOS a packaged Tauri app is served from the custom
//! `tauri://localhost` scheme. YouTube rejects embeds from non-http(s) origins
//! with player error 153, so the video can never start. Loading the player from
//! a real `http://localhost:<port>` origin gives YouTube an origin it accepts.
//! Images ride along on the same server so there is only one mechanism to reason
//! about (and no need to widen Tauri's asset-protocol scope).
//!
//! This is intentionally NOT `tauri-plugin-localhost`: that would move the whole
//! app — including the Tauri IPC surface — onto an open local port. This server
//! binds to loopback only and exposes no app state.

use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::OnceLock;

static PLAYER_PORT: OnceLock<u16> = OnceLock::new();
static IMAGE_DIR: OnceLock<PathBuf> = OnceLock::new();

const PLAYER_HTML: &str = include_str!("../player/player.html");

/// Port the player page is served on, or `None` if the server failed to start.
pub fn port() -> Option<u16> {
    PLAYER_PORT.get().copied()
}

/// Directory imported background images are stored in.
pub fn image_dir() -> Option<&'static PathBuf> {
    IMAGE_DIR.get()
}

pub fn start(image_dir: PathBuf) -> std::io::Result<u16> {
    let _ = std::fs::create_dir_all(&image_dir);
    let _ = IMAGE_DIR.set(image_dir);

    // Port 0 => let the OS pick a free ephemeral port.
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let port = listener.local_addr()?.port();
    let _ = PLAYER_PORT.set(port);

    std::thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            std::thread::spawn(move || {
                let _ = serve(stream);
            });
        }
    });

    Ok(port)
}

/// Only simple names are servable. Anything with a path separator, `..`, or an
/// unexpected character is rejected outright rather than normalised, so there is
/// no traversal to reason about.
pub fn is_safe_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 128
        && !name.contains("..")
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_')
}

fn content_type_for(name: &str) -> Option<&'static str> {
    let ext = name.rsplit('.').next()?.to_ascii_lowercase();
    Some(match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "avif" => "image/avif",
        _ => return None,
    })
}

fn write_response(
    stream: &mut TcpStream,
    status: &str,
    content_type: &str,
    body: &[u8],
) -> std::io::Result<()> {
    let head = format!(
        "HTTP/1.1 {status}\r\n\
         Content-Type: {content_type}\r\n\
         Content-Length: {len}\r\n\
         Cache-Control: no-store\r\n\
         X-Content-Type-Options: nosniff\r\n\
         Connection: close\r\n\
         \r\n",
        len = body.len()
    );
    stream.write_all(head.as_bytes())?;
    stream.write_all(body)?;
    stream.flush()
}

fn serve(mut stream: TcpStream) -> std::io::Result<()> {
    let mut request_line = String::new();
    BufReader::new(stream.try_clone()?).read_line(&mut request_line)?;

    let path = request_line
        .split_whitespace()
        .nth(1)
        .unwrap_or("")
        .split('?')
        .next()
        .unwrap_or("");

    if request_line.starts_with("GET ") && path == "/player.html" {
        return write_response(
            &mut stream,
            "200 OK",
            "text/html; charset=utf-8",
            PLAYER_HTML.as_bytes(),
        );
    }

    if request_line.starts_with("GET ") {
        if let Some(name) = path.strip_prefix("/bg/") {
            if is_safe_name(name) {
                if let (Some(dir), Some(ctype)) = (image_dir(), content_type_for(name)) {
                    let file = dir.join(name);
                    if let Ok(bytes) = std::fs::read(&file) {
                        return write_response(&mut stream, "200 OK", ctype, &bytes);
                    }
                }
            }
        }
    }

    write_response(
        &mut stream,
        "404 Not Found",
        "text/plain; charset=utf-8",
        b"not found",
    )
}
