import { Context, Schema, h } from 'koishi'
import { spawn, exec } from 'child_process'
import { createHash } from 'crypto'
import { promisify } from 'util'
import { join } from 'path'
import fs from 'fs'
// npm publish --workspace koishi-plugin-hajimi-lizard --access public --registry https://registry.npmjs.org
const execPromise = promisify(exec)

export const name = 'hajimi-lizard'

export const usage = `
# 😎给你的色图打上哈基马赛克

## 插件修改自[AutoHajimiMosaic](https://github.com/frinkleko/AutoHajimiMosaic)项目


## 插件仅需安装python，开箱即用
### 使用前请配置python到系统环境变量，或找到python.exe的路径

---

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

<strong>可以[点这里](https://github.com/lizard0126/javbus-lizard/issues)创建议题~</strong>
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
  patternPath: Schema.string().description('猫纹路图片路径（形如C:/Users/82545/Desktop/pic.jpg），为空则默认').default(''),
  headPath: Schema.string().description('猫头图片路径（形如C:/Users/82545/Desktop/pic.jpg），为空则默认').default(''),
  autoClean: Schema.boolean().description('是否自动清理临时文件').default(true),
})

const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
const DEFAULT_TIMEOUT = 10000

// 扩展名
function getExtFromUrl(url: string) {
  return url.split('.').pop()?.split(/\#|\?/)[0]?.toLowerCase()
}

// 运行脚本
async function runPythonScript(pythonExec: string, args: string[], cwd: string) {
  const process = spawn(pythonExec, args, { cwd })

  let stdout = ''
  let stderr = ''
  process.stdout.on('data', (data) => stdout += data)
  process.stderr.on('data', (data) => stderr += data)

  const exitCode = await new Promise<number>((resolve) => {
    process.on('close', resolve)
  })

  return { exitCode, stdout, stderr }
}

// 计算哈希
function hashFile(path: string) {
  const content = fs.readFileSync(path, 'utf-8')
  return createHash('sha256').update(content).digest('hex')
}

export async function apply(ctx: Context, config: Config) {
  const cacheDir = join(ctx.baseDir, 'cache/hajimi')
  const inputDir = join(cacheDir, 'input')
  const outputDir = join(cacheDir, 'output')
  const hajimiDir = join(__dirname, '../src')
  const requirementsPath = join(hajimiDir, 'requirements.txt')
  const batchScript = join(hajimiDir, 'batch_process.py')
  const depsFlagPath = join(cacheDir, '.deps_installed')

  const patternImage = config.patternPath || join(hajimiDir, 'assets/pattern.png')
  const headImage = config.headPath || join(hajimiDir, 'assets/head.png')

  fs.mkdirSync(inputDir, { recursive: true })
  fs.mkdirSync(outputDir, { recursive: true })

  let pythonExec = config.pythonPath || process.env.PYTHON_PATH || 'python'

  try {
    await execPromise(`${pythonExec} --version`)
  } catch (e) {
    ctx.logger('hajimi').error(`Python不可用，请检查环境: ${e.message}`)
    return
  }

  let installDeps = true
  let currentHash = ''
  if (fs.existsSync(depsFlagPath)) {
    try {
      const savedHash = fs.readFileSync(depsFlagPath, 'utf-8')
      currentHash = hashFile(requirementsPath)
      if (savedHash === currentHash) {
        installDeps = false
      }
    } catch (e) {
      ctx.logger('hajimi').warn('读取依赖缓存失败，将重新安装依赖')
    }
  }

  if (installDeps) {
    try {
      ctx.logger('hajimi').info('首次运行或依赖变更，正在安装 Python 依赖...')
      await execPromise(`"${pythonExec}" -m pip install -r "${requirementsPath}"`)
      currentHash ||= hashFile(requirementsPath)
      fs.writeFileSync(depsFlagPath, currentHash)
      ctx.logger('hajimi').info('依赖安装完成')
    } catch (e) {
      ctx.logger('hajimi').error(`依赖安装失败: ${e.stderr || e.message}`)
      return
    }
  } else {
    ctx.logger('hajimi').info('Python 依赖已安装，跳过安装步骤')
  }

  ctx.command('猫赛克 ', '处理图片')
    .action(async ({ session }) => {
      const images = session.elements.filter(el => el.type === 'img')
      if (!images.length) return '请在指令后加上需要处理的图片'

      const timestamp = Date.now()
      const currentInput = join(inputDir, String(timestamp))
      const currentOutput = join(outputDir, String(timestamp))

      fs.mkdirSync(currentInput, { recursive: true })
      fs.mkdirSync(currentOutput, { recursive: true })

      await Promise.all(images.map(async (el, i) => {
        const src = el.attrs?.src
        if (!src) return

        try {
          const buffer = await ctx.http.get<Buffer>(src, {
            responseType: 'arraybuffer',
            timeout: DEFAULT_TIMEOUT,
          })

          const ext = SUPPORTED_EXTENSIONS.has(getExtFromUrl(src)) ? getExtFromUrl(src) : 'jpg'
          fs.writeFileSync(join(currentInput, `${i}.${ext}`), Buffer.from(buffer))
        } catch (e) {
          ctx.logger('hajimi').warn(`下载第 ${i + 1} 张图片失败:`, e)
        }
      }))

      const [tipMessageId] = await session.send('图片处理中，请稍候...')

      const { exitCode, stderr } = await runPythonScript(
        pythonExec,
        [
          batchScript,
          currentInput,
          currentOutput,
          '--pattern_image', patternImage,
          '--head_image', headImage,
        ],
        hajimiDir
      )

      if (exitCode !== 0) {
        await session.send(`处理失败`)
        ctx.logger.error(stderr)
      }

      const files = fs.readdirSync(currentOutput)
      if (!files.length) {
        await session.send('未生成输出文件，可能还不够色')
      }

      await session.bot.deleteMessage(session.channelId, tipMessageId);

      await Promise.all(files.map(file =>
        session.send(h.image(`file://${join(currentOutput, file)}`))
      ))

      if (config.autoClean !== false) {
        try {
          fs.rmSync(currentInput, { recursive: true, force: true })
          fs.rmSync(currentOutput, { recursive: true, force: true })
        } catch (e) {
          ctx.logger('hajimi').warn('清理临时文件失败:', e)
        }
      }
    })
}