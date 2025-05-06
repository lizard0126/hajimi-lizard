# koishi-plugin-autohajimi-lizard

[![npm](https://img.shields.io/npm/v/koishi-plugin-hajimi-lizard?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-hajimi-lizard)

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