#!/usr/bin/env node

import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import cliProgress from 'cli-progress'

const files = fs.readdirSync('./')
ffmpeg.setFfmpegPath(ffmpegStatic);

const mp4Files = files.filter((file) => file.includes('.mp4') && !file.includes('-1080') && !file.includes('-720'))

async function getLogs() {
    if (!fs.existsSync('./log.json')) {
        fs.writeFileSync('./log.json', JSON.stringify([]))
    }
    const log = fs.readFileSync('./log.json', 'utf-8')
    return JSON.parse(log)
}

async function logFiles() {
    const log = await getLogs()
    const newLog = [...mp4Files]
    const mapLog = newLog.map((file) => {
        if (typeof file === 'string') {
            const found = log.find((logFile) => logFile.name === file)
            if (found) {
                return found
            } else {
                return {
                    name: file,
                    processed: {
                        720: false,
                        1080: false
                    }
                }
            }
        } else {
            return file
        }
    })

    fs.unlinkSync('./log.json')
    fs.writeFileSync('./log.json', JSON.stringify(mapLog))

    return mapLog
}

async function convertVideo(video, resolution) {

    const bar = new cliProgress.SingleBar({
        format: 'H264 Yeniyor ' + video.name + ' |' + '{bar}' + '| {percentage}%'
    }, cliProgress.Presets.shades_classic)

    bar.start(100,0)
    ffmpeg().input(video.name).outputOptions('-c:v', 'libx264', '-crf', '23', '-preset', 'fast', '-c:a', 'aac', '-b:a', '128k').output(`${resolution}-${video.name}`).on('end', () => {
        updateLog(video, resolution)
        bar.stop()
    }).on('error', (err) => {
        console.log(err)
    }).on('progress', (progress) => {
        if (progress.percent) {
            bar.update(Math.floor(progress.percent))
        }
    }).run()
}

function updateLog(video ,res) {
    const log = getLogs()
    const newLog = log.map((file) => {
        if (file.name === video.name) {
            file.processed[res] = true
        }
        return file
    })
    fs.writeFileSync('./log.json', JSON.stringify(newLog))
}

async function main() {
    console.log('H264EATER')
    const log = await logFiles()
    log.forEach(element => {
        if (!element.processed[720]) {
            convertVideo(element, 720)
        }
    });
    // ayrı yoksa ikisini birden yapıyor
    log.forEach(element => {    
        if (!element.processed[1080]) {
            convertVideo(element, 1080)
        }
    }
    );
}

await main()