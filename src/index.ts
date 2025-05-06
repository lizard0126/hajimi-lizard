import { Context, Schema, h } from 'koishi'
import { spawn, exec } from 'child_process'
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

### 处理图片
#### 示例：
<pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">猫赛克 [图片] // 给图片打上哈基码</pre>

- 使用此指令处理传入的图片并添加猫赛克效果。
- 图片将通过预设的猫头和猫纹路进行处理。

### 配置选项
<pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">配置 Python 路径：
C:/Users/user/AppData/Local/Programs/Python/Python313/python.exe</pre>
- 你可以在插件配置中设置 pythonPath 来指定 Python 解释器的路径。默认情况下，插件将使用系统环境变量中的 Python 路径。

#### 修改系统环境变量：
- **Linux/macOS**：
  在终端中设置 PYTHON_PATH 环境变量：
  <pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">export PYTHON_PATH=/path/to/python</pre>

- **Windows**：
  在命令行中设置 PYTHON_PATH 环境变量：
  <pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">set PYTHON_PATH=C:\\path\\to\\python.exe</pre>

#### 配置猫纹路的图片：
<pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">配置猫纹路图片：patternPath=/path/to/pattern.png</pre>

#### 配置猫头的图片：
<pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">配置猫头图片：headPath=/path/to/head.png</pre>

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
}

export const Config: Schema<Config> = Schema.object({
  pythonPath: Schema.string().description('指定 python.exe路径（为空则使用系统环境变量，不是用户环境变量）').default(''),
  patternPath: Schema.string().description('猫纹路图片路径，为空则默认').default(''),
  headPath: Schema.string().description('猫头图片路径，为空则默认').default(''),
})

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
  ctx.logger('hajimi').error(pythonExec)
  try {
    await execPromise(`${pythonExec} --version`)
  } catch (e) {
    ctx.logger('hajimi').error(`Python不可用，请检查环境: ${e.message}`)
    return
  }

  if (!fs.existsSync(depsFlagPath)) {
    try {
      ctx.logger('hajimi').info('正在安装Python依赖...')
      await execPromise(`${pythonExec} -m pip install -r ${requirementsPath}`)
      fs.writeFileSync(depsFlagPath, '')
    } catch (e) {
      ctx.logger('hajimi').error(`依赖安装失败: ${e.stderr || e.message}`)
      return
    }
  }

  ctx.command('猫赛克 <image:image>', '处理图片')
    .action(async ({ session }, image) => {
      if (!image) return '请在指令后加上需要处理的图片'

      const timestamp = Date.now()
      const currentInput = join(inputDir, String(timestamp))
      const currentOutput = join(outputDir, String(timestamp))
      fs.mkdirSync(currentInput, { recursive: true })
      fs.mkdirSync(currentOutput, { recursive: true })

      try {
        const buffer = Buffer.from(await ctx.http.get<Buffer>(image.src, {
          responseType: 'arraybuffer',
          timeout: 10000,
        }))

        const inputPath = join(currentInput, `0.jpg`)
        fs.writeFileSync(inputPath, buffer)
        const [tipMessageId] = await session.send('图片处理中，请稍候...')

        const args = [
          batchScript,
          currentInput,
          currentOutput,
          '--pattern_image', patternImage,
          '--head_image', headImage,
        ]

        const process = spawn(pythonExec, args, {
          cwd: hajimiDir,
        })

        let stdout = ''
        let stderr = ''
        process.stdout.on('data', (data) => stdout += data)
        process.stderr.on('data', (data) => stderr += data)

        const exitCode = await new Promise<number>((resolve) => {
          process.on('close', resolve)
        })

        if (exitCode !== 0) {
          ctx.logger('hajimi').error(`处理失败: ${stderr}`)
          throw new Error('图片处理失败')
        }

        const files = fs.readdirSync(currentOutput)
        if (!files.length) {
          throw new Error('未生成输出文件')
        }

        await session.bot.deleteMessage(session.channelId, tipMessageId);
        for (const file of files) {
          await session.send(h.image(`file://${join(currentOutput, file)}`))
        }

      } catch (e) {
        ctx.logger('hajimi').error(e)
        return `处理出错: ${e.message}`
      } finally {
        try {
          fs.rmSync(currentInput, { recursive: true, force: true })
          fs.rmSync(currentOutput, { recursive: true, force: true })
        } catch (e) {
          ctx.logger('hajimi').warn('清理临时文件失败:', e)
        }
      }
    })
}