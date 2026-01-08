import { Context } from 'koishi'
import { spawn, exec } from 'child_process'
import { createHash } from 'crypto'
import { promisify } from 'util'
import { join } from 'path'
import fs from 'fs'
import { Config } from './index'

const execPromise = promisify(exec)

const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
const DEFAULT_TIMEOUT = 10000

function getExtFromUrl(url: string) {
  return url.split('.').pop()?.split(/\#|\?/)[0]?.toLowerCase()
}

function hashFile(path: string) {
  const content = fs.readFileSync(path, 'utf-8')
  return createHash('sha256').update(content).digest('hex')
}

async function runPythonScript(pythonExec: string, args: string[], cwd: string) {
  const process = spawn(pythonExec, args, { cwd })

  let stderr = ''
  process.stderr.on('data', d => stderr += d)

  const exitCode = await new Promise<number>(resolve => {
    process.on('close', resolve)
  })

  return { exitCode, stderr }
}

export class HajimiProcessor {
  private cacheDir: string
  private inputDir: string
  private outputDir: string
  private hajimiDir: string
  private pythonExec: string

  private batchScript: string
  private requirementsPath: string
  private depsFlagPath: string
  private patternImage: string
  private headImage: string

  constructor(private ctx: Context, private config: Config) {
    this.cacheDir = join(ctx.baseDir, 'cache/hajimi')
    this.inputDir = join(this.cacheDir, 'input')
    this.outputDir = join(this.cacheDir, 'output')
    this.hajimiDir = join(__dirname)
    this.batchScript = join(this.hajimiDir, 'batch_process.py')
    this.requirementsPath = join(this.hajimiDir, 'requirements.txt')
    this.depsFlagPath = join(this.cacheDir, '.deps_installed')

    this.patternImage = config.patternPath || join(this.hajimiDir, 'assets/pattern.png')
    this.headImage = config.headPath || join(this.hajimiDir, 'assets/head.png')

    fs.mkdirSync(this.inputDir, { recursive: true })
    fs.mkdirSync(this.outputDir, { recursive: true })

    this.pythonExec = config.pythonPath || process.env.PYTHON_PATH || 'python'
  }

  async init() {
    await execPromise(`${this.pythonExec} --version`)

    let installDeps = true
    let currentHash = ''

    if (fs.existsSync(this.depsFlagPath)) {
      const savedHash = fs.readFileSync(this.depsFlagPath, 'utf-8')
      currentHash = hashFile(this.requirementsPath)
      if (savedHash === currentHash) installDeps = false
    }

    if (installDeps) {
      await execPromise(`"${this.pythonExec}" -m pip install -r "${this.requirementsPath}"`)
      currentHash ||= hashFile(this.requirementsPath)
      fs.writeFileSync(this.depsFlagPath, currentHash)
    }
  }

  async processImages(inputs: string[]) {
    const timestamp = Date.now().toString()
    const currentInput = join(this.inputDir, timestamp)
    const currentOutput = join(this.outputDir, timestamp)

    fs.mkdirSync(currentInput, { recursive: true })
    fs.mkdirSync(currentOutput, { recursive: true })

    await Promise.all(inputs.map(async (src, i) => {
      const buffer = await this.ctx.http.get<Buffer>(src, {
        responseType: 'arraybuffer',
        timeout: DEFAULT_TIMEOUT,
      })

      const ext = SUPPORTED_EXTENSIONS.has(getExtFromUrl(src)!)
        ? getExtFromUrl(src)!
        : 'jpg'

      fs.writeFileSync(join(currentInput, `${i}.${ext}`), Buffer.from(buffer))
    }))

    const { exitCode, stderr } = await runPythonScript(
      this.pythonExec,
      [
        this.batchScript,
        currentInput,
        currentOutput,
        '--pattern_image', this.patternImage,
        '--head_image', this.headImage,
      ],
      this.hajimiDir
    )

    if (exitCode !== 0) {
      this.ctx.logger('hajimi').error(stderr)
      throw new Error('hajimi failed')
    }

    const files = fs.readdirSync(currentOutput)
    const results = files.map(f => join(currentOutput, f))

    if (this.config.autoClean !== false) {
      fs.rmSync(currentInput, { recursive: true, force: true })
      fs.rmSync(currentOutput, { recursive: true, force: true })
    }

    return results
  }
}

export interface hajimi {
  processImages(inputs: string[]): Promise<string[]>
}