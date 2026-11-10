use sha2::{Digest, Sha256};
use std::io::Cursor;

pub const MAX_BYTES: usize = 8 * 1024 * 1024;
pub struct Texture {
    pub png: Vec<u8>,
    pub head: Vec<u8>,
    pub hash: String,
    pub width: u32,
    pub height: u32,
    pub slim: bool,
}

pub fn encode(rgba: &[u8], width: u32, height: u32) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut out, width, height);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        encoder.set_compression(png::Compression::Fast);
        let mut writer = encoder.write_header().map_err(|e| e.to_string())?;
        writer.write_image_data(rgba).map_err(|e| e.to_string())?;
    }
    Ok(out)
}

pub fn normalize(bytes: &[u8]) -> Result<Texture, String> {
    if bytes.len() > MAX_BYTES || !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        return Err("Choose a PNG skin smaller than 8 MB.".into());
    }
    let mut decoder = png::Decoder::new_with_limits(
        Cursor::new(bytes),
        png::Limits {
            bytes: 24 * 1024 * 1024,
        },
    );
    decoder.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
    let mut reader = decoder
        .read_info()
        .map_err(|_| "This PNG is damaged or unreadable.")?;
    let info = reader.info();
    let (width, height) = (info.width, info.height);
    if !(64..=1024).contains(&width)
        || !width.is_power_of_two()
        || (height != width && height != width / 2)
    {
        return Err("Use a square Minecraft skin (64–1024 px), or a legacy 2:1 skin.".into());
    }
    if info.animation_control.is_some() {
        return Err("Animated PNGs cannot be used as Minecraft skins.".into());
    }
    let mut raw = vec![
        0;
        reader
            .output_buffer_size()
            .ok_or("This image is too large.")?
    ];
    let frame = reader
        .next_frame(&mut raw)
        .map_err(|_| "This PNG is damaged or incomplete.")?;
    reader
        .finish()
        .map_err(|_| "This PNG is damaged or incomplete.")?;
    let channels = frame.color_type.samples();
    let mut rgba = Vec::with_capacity(width as usize * height as usize * 4);
    for px in raw[..frame.buffer_size()].chunks_exact(channels) {
        match frame.color_type {
            png::ColorType::Rgba => rgba.extend_from_slice(px),
            png::ColorType::Rgb => rgba.extend_from_slice(&[px[0], px[1], px[2], 255]),
            png::ColorType::Grayscale => rgba.extend_from_slice(&[px[0], px[0], px[0], 255]),
            png::ColorType::GrayscaleAlpha => rgba.extend_from_slice(&[px[0], px[0], px[0], px[1]]),
            _ => return Err("Unsupported PNG color format.".into()),
        }
    }
    let scale = width / 64;
    let sample = |x: u32, y: u32| -> &[u8] {
        let i = ((y * width + x) * 4) as usize;
        &rgba[i..i + 4]
    };
    let slim = height == width
        && (20 * scale..32 * scale).all(|y| (54 * scale..56 * scale).all(|x| sample(x, y)[3] == 0));
    // A tiny head thumbnail avoids decoding a full HD texture in every library tile.
    let mut head = Vec::with_capacity(8 * 8 * 4);
    for y in 0..8 {
        for x in 0..8 {
            let base = sample((8 + x) * scale, (8 + y) * scale);
            let hat = sample((40 + x) * scale, (8 + y) * scale);
            let alpha = hat[3] as u32;
            for channel in 0..3 {
                head.push(
                    ((hat[channel] as u32 * alpha + base[channel] as u32 * (255 - alpha)) / 255)
                        as u8,
                );
            }
            head.push(255);
        }
    }
    let mut digest = Sha256::new();
    digest.update(width.to_le_bytes());
    digest.update(height.to_le_bytes());
    digest.update(&rgba);
    Ok(Texture {
        png: encode(&rgba, width, height)?,
        head: encode(&head, 8, 8)?,
        hash: format!("{:x}", digest.finalize()),
        width,
        height,
        slim,
    })
}
