import { Context, Schema, h, Service } from 'koishi'
import { spawn, exec } from 'child_process'
import { createHash } from 'crypto'
import { promisify } from 'util'
import { join } from 'path'
import fs from 'fs'

const execPromise = promisify(exec)

export const name = 'hajimi-lizard'

export const usage = `
# 😎给你的色图打上哈基马赛克

## 插件修改自[AutoHajimiMosaic](https://github.com/frinkleko/AutoHajimiMosaic)项目


## 插件仅需安装python，开箱即用
### 使用前请配置python到系统环境变量，或找到python.exe的路径

---

<details>
<summary><strong><span style="font-size: 1.3em; color: #2a2a2a;">调用服务示例</span></strong></summary>

### 外部插件如何调用 hajimi 服务

- 首先在外部插件里声明依赖：

<pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">
import { Context, Schema, h } from 'koishi'
import {} from 'koishi-plugin-hajimi-lizard'
export const inject = ['hajimi']
</pre>

- 然后就可以通过 ctx.hajimi.processImages 调用：

<pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">
const urls = [
  'https://example.com/a.jpg',
  'https://example.com/b.png'
]

const results = await ctx.hajimi.processImages(urls)
  for (const p of results) {
    await session.send(h.image(\`file://\${p}\`))
  }
</pre>

- processImages 接收图片 URL 数组，返回本地生成图片路径数组
- 如果返回为空，说明未生成输出文件

</details>

<details>
<summary><strong><span style="font-size: 1.3em; color: #2a2a2a;">使用方法</span></strong></summary>

### 指令示例：
<pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">猫赛克 [图片] // 给图片打上哈基码</pre>
<pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">猫赛克 [图片][图片][图片] // 支持多图</pre>

- 使用此指令传入图片，添加猫赛克效果。
- 图片将通过预设的猫头和猫纹路进行处理。

### 配置python路径（pythonPath）：
<pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">填写你Python解释器的路径</pre>
- 你可以在插件配置中设置 pythonPath 来指定 Python 解释器的路径。默认情况下，插件将使用系统环境变量中的 Python 路径。
- 路径大多为：C:\\Users\\yourPC\\AppData\\Local\\Programs\\Python\\Python313\\python.exe

#### 修改系统环境变量：
- **Linux/macOS**：
  在终端中设置 PYTHON_PATH 环境变量：
  <pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">export PYTHON_PATH=你python的路径</pre>

- **Windows**：
  在命令行中设置 PYTHON_PATH 环境变量：
  <pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">set PYTHON_PATH=你python.exe的路径</pre>

### 配置猫纹路的图片（patternPath）：
<pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">仅支持本地图片！</pre>

### 配置猫头的图片（headPath）：
<pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">仅支持本地图片！</pre>

</details>

<details>
<summary><strong><span style="font-size: 1.3em; color: #2a2a2a;">如果要反馈建议或报告问题</span></strong></summary>

<strong>可以[点这里](https://github.com/lizard0126/hajimi-lizard/issues)创建议题~</strong>
</details>

<details>
<summary><strong><span style="font-size: 1.3em; color: #2a2a2a;">如果喜欢我的插件</span></strong></summary>

<strong>可以[请我喝可乐](https://ifdian.net/a/lizard0126)，没准就有动力更新新功能了~</strong>
</details>
`;

export interface Config {
  pythonPath: string
  patternPath: string
  headPath: string
  autoClean?: boolean
}

export const Config: Schema<Config> = Schema.object({
  pythonPath: Schema.string().description('指定 python.exe路径（为空则使用系统环境变量）').default(''),
  patternPath: Schema.string().description('填充纹路图片路径（形如C:/Users/82545/Desktop/pic.jpg），为空则默认').default(''),
  headPath: Schema.string().description('猫头图片路径（形如C:/Users/82545/Desktop/pic.jpg），为空则默认').default(''),
  autoClean: Schema.boolean().description('是否自动清理临时文件').default(true),
})

const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
const DEFAULT_TIMEOUT = 10000

function getExtFromUrl(url: string) {
  return url.split('.').pop()?.split(/\#|\?/)[0]?.toLowerCase()
}

async function runPythonScript(pythonExec: string, args: string[], cwd: string) {
  const process = spawn(pythonExec, args, { cwd })

  let stderr = ''
  process.stderr.on('data', (d) => (stderr += d))

  const exitCode = await new Promise<number>((resolve) => {
    process.on('close', resolve)
  })

  return { exitCode, stderr }
}

function hashFile(path: string) {
  const content = fs.readFileSync(path, 'utf-8')
  return createHash('sha256').update(content).digest('hex')
}

//自定义服务
export class HajimiService extends Service {
  private pythonExec!: string
  private inputDir!: string
  private outputDir!: string
  private hajimiDir!: string
  private batchScript!: string
  private patternImage!: string
  private headImage!: string
  private autoClean = true

  constructor(ctx: Context, config: Config) {
    super(ctx, 'hajimi')

    const cacheDir = join(ctx.baseDir, 'cache/hajimi')
    this.inputDir = join(cacheDir, 'input')
    this.outputDir = join(cacheDir, 'output')
    this.hajimiDir = join(__dirname, '../src')
    this.batchScript = join(this.hajimiDir, 'batch_process.py')

    this.patternImage =
      config.patternPath || join(this.hajimiDir, 'assets/pattern.png')
    this.headImage =
      config.headPath || join(this.hajimiDir, 'assets/head.png')

    this.autoClean = config.autoClean !== false

    fs.mkdirSync(this.inputDir, { recursive: true })
    fs.mkdirSync(this.outputDir, { recursive: true })

    this.pythonExec = config.pythonPath || process.env.PYTHON_PATH || 'python'
    this.initPythonDeps(ctx)
  }

  private async initPythonDeps(ctx: Context) {
    const requirementsPath = join(this.hajimiDir, 'requirements.txt')
    const depsFlagPath = join(ctx.baseDir, 'cache/hajimi/.deps_installed')

    try {
      await execPromise(`${this.pythonExec} --version`)
    } catch (e) {
      ctx.logger('hajimi').error('Python 不可用')
      throw e
    }

    let needInstall = true
    if (fs.existsSync(depsFlagPath)) {
      const saved = fs.readFileSync(depsFlagPath, 'utf-8')
      const current = hashFile(requirementsPath)
      if (saved === current) needInstall = false
    }

    if (needInstall) {
      ctx.logger('hajimi').info('正在安装 Python 依赖...')
      await execPromise(
        `"${this.pythonExec}" -m pip install -r "${requirementsPath}"`
      )
      fs.writeFileSync(depsFlagPath, hashFile(requirementsPath))
    }
  }

  async processImages(urls: string[]): Promise<string[]> {
    const stamp = Date.now()
    const input = join(this.inputDir, String(stamp))
    const output = join(this.outputDir, String(stamp))

    fs.mkdirSync(input, { recursive: true })
    fs.mkdirSync(output, { recursive: true })

    await Promise.all(
      urls.map(async (url, i) => {
        const buffer = await this.ctx.http.get<Buffer>(url, {
          responseType: 'arraybuffer',
          timeout: DEFAULT_TIMEOUT,
        })
        const ext = SUPPORTED_EXTENSIONS.has(getExtFromUrl(url))
          ? getExtFromUrl(url)
          : 'jpg'
        fs.writeFileSync(join(input, `${i}.${ext}`), Buffer.from(buffer))
      })
    )

    const { exitCode, stderr } = await runPythonScript(
      this.pythonExec,
      [
        this.batchScript,
        input,
        output,
        '--pattern_image',
        this.patternImage,
        '--head_image',
        this.headImage,
      ],
      this.hajimiDir
    )

    if (exitCode !== 0) {
      throw new Error(stderr)
    }

    const files = fs.readdirSync(output).map((f) => join(output, f))

    if (this.autoClean) {
      fs.rmSync(input, { recursive: true, force: true })
    }

    return files
  }
}

declare module 'koishi' {
  interface Context {
    hajimi: HajimiService
  }
}

export function apply(ctx: Context, config: Config) {
  ctx.plugin(HajimiService, config)

  ctx.command('猫赛克', '处理图片')
    .action(async ({ session }) => {
      const images = session.elements.filter((el) => el.type === 'img')
      if (!images.length) return '请在指令后附带图片'

      const urls = images.map((el) => el.attrs.src)

      const [tipId] = await session.send('图片处理中，请稍候...')

      try {
        const results = await ctx.hajimi.processImages(urls)
        await session.bot.deleteMessage(session.channelId, tipId)
        for (const file of results) {
          await session.send(h.image(`file://${file}`))
        }
      } catch (e) {
        ctx.logger('hajimi').error(e)
        return '处理失败'
      }
    })
}