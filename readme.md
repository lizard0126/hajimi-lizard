# koishi-plugin-autohajimi-lizard

[![npm](https://img.shields.io/npm/v/koishi-plugin-hajimi-lizard?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-hajimi-lizard)

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