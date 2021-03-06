<template>
  <transition name="stage-box">
    <div v-show="visible" id="stage">
      <div id="top-action-bar">
        <div id="top-right-action-bar">
          <el-popover
            placement="bottom"
            width="400"
            trigger="click"
          >
            <el-table :data="topRightTips">
              <el-table-column property="name" align="left" width="100px" label="Name" />
              <el-table-column property="key" align="center" min-width="60px" label="Key" />
            </el-table>
            <span slot="reference" class="el-icon-s-opportunity top-right-box" />
          </el-popover>
          <i v-if="lastText===text" class="el-icon-success top-right-box" style="color:#67C23A"/>
          <i v-if="lastText!==text" class="el-icon-warning top-right-box" />
          <el-input v-model="title" accept="image/*, .pdf" type="text" size="mini" show-word-limit class="top-right-box" placeholder="Enter a title" />
          <el-button size="mini" type="primary" round @click="handleSave">Save</el-button>
          <el-button size="mini" type="danger" round @click="handleClose">Quit</el-button>
        </div>
        <div id="top-left-action-bar">
          <el-button size="mini" type="text" round @click="hanldeSelectedTextBold">Bold</el-button>
          <el-button size="mini" type="text" round @click="hanldeSelectedTextItalic">Italic</el-button>
          
          <el-popover placement="bottom">
            <el-color-picker
              v-model="textColor"
              size="medium"
              show-alpha
              color-format="rgb"
              @change="handleColorChange"
              :predefine="predefineColors">
            </el-color-picker>
            <span>{{ textColor }}</span>
            <el-button slot="reference" size="mini" type="text" round @click="hanldeSelectedTextColor">Color</el-button>
          </el-popover>
          
          <el-popover
            placement="bottom"
            width="400"
            trigger="click"
            @hide="handleUploadPopoverHide"
          >
            <input id="file" ref="files" type="file" class="custom-file-input" multiple @change="previewFiles">
            <label for="file" class="el-button el-button--primary el-button--mini is-round">点击上传</label>
            <span class="upload-text">{{ selectedFilesInfo }}</span>
            <el-button slot="reference" size="mini" type="text" round @click="hanldeSelectedTextItalic">Image</el-button>
            <br>
            <span v-if="uploadTotalInfo" class="upload-text">{{ uploadTotalInfo }}</span>
            <el-progress :percentage="progressTotal" />
            <br>
            <span v-if="uploadInfo" class="upload-text">{{ uploadInfo }}</span>
            <el-progress :percentage="progress" />
          </el-popover>
        </div>
      </div>
      <div id="editor">
        <div id="content-editor">
          <textarea
            ref="textEditArea"
            v-model="text"
            @keydown.tab.exact.prevent="handleTabKeyDown"
            @keydown.shift.tab.exact.prevent="handleShiftTabKeyDown"
            @keydown.meta.83.prevent="handleSave"
            @keydown.ctrl.83.prevent="handleSave"
            @keydown.meta.90.prevent="handlePreCancel"
            @keydown.ctrl.90.prevent="handlePreCancel"
          />
        </div>
        <div id="content-preview" v-html="markedText" />
      </div>
      <div id="bottom-action-bar">
        <span class="bottom-text">
          lines: {{ lines }}
        </span>
        <span class="bottom-text">
          words: {{ words }}
        </span>
        <span class="bottom-text">
          col: {{ col }}
        </span>
        <span class="bottom-text">
          row: {{ row }}
        </span>
      </div>
      
    </div>
  </transition>
</template>

<script>
import { getUploadToken } from '@/api/qiniu'
import marked from 'marked'
import * as qiniu from 'qiniu-js'
import { pop_error } from '@/utils/popup.js'

export default {
  name: 'ItsMarkdown',
  props: {
    beforeClose: {
      type: Function,
      default: () => {}
    },
    visible: {
      type: Boolean,
      default: false
    },
    appendToBody: {
      type: Boolean,
      default: true
    },
    content: {
      type: Object,
      default() {
        return {
          title: 'Untitled',
          text: '',
          x: 0,
          y: 0
        }
      }
    }
  },
  data() {
    return {
      predefineColors: [
        '#ff4500',
        '#ff8c00',
        '#ffd700',
        '#90ee90',
        '#00ced1',
        '#1e90ff',
        '#c71585',
        'rgba(255, 69, 0, 0.68)',
        'rgb(255, 120, 0)',
        'hsv(51, 100, 98)',
        'hsva(120, 40, 94, 0.5)',
        'hsl(181, 100%, 37%)',
        'hsla(209, 100%, 56%, 0.73)',
        '#c7158577'
      ],
      textColor: '#000000',
      imgDomain: 'https://static.itsblog.cn/',
      isCancel: false,
      col: 0,
      row: 0,
      form: {},
      id: 0,
      lastText: '',
      title: '',
      text: '## This is a title',
      closed: false,
      lines: 0,
      words: 0,
      x: 0,
      y: 0,
      temp: [], // for step cancel
      curVersionIndex: 0,
      selectedFilesInfo: 'None',
      uploadInfo: '',
      progress: 0,
      progressTotal: 0,
      uploadCount: 0,
      uploadTotalInfo: '0/0',
      subscription: undefined,
      topRightTips: [
        {
          name: 'Save',
          key: 'Command + S or Ctrl + S'
        },
        {
          name: 'Cancel',
          key: 'Command + Z or Ctrl + Z'
        },
        {
          name: 'Indent',
          key: 'Tab(two spaces)'
        }
      ]
    }
  },
  computed: {
    markedText: function() {
      return marked(this.text)
    }
  },
  watch: {
    content(val) {
      this.resetEditor()
      this.id = val.id
      this.title = val.title
      this.text = val.text
      this.lastText = this.text
      this.x = val.x
      this.y = val.y
      this.assignXAndY()
      this.statistics(this.text)
    },
    text(val) {
      this.statistics(val)
      this.record(val)
    },
    visible(val) {
      if (val) {
        this.closed = false
        this.$emit('open')
        if (this.appendToBody) {
          document.body.appendChild(this.$el)
        }
      } else {
        if (!this.closed) this.$emit('close')
      }
    }
  },
  created() {
    this.resetEditor()
    this.lastText = this.text
    this.statistics(this.text)
    this.assignXAndY()
  },
  methods: {
    handleUploadPopoverHide() {
      if (this.subscription) {
        this.subscription.unsubscribe()
        pop_error('Upload canceled')
      }
      this.resetUploadData()
    },
    resetUploadData() {
      this.progress = 0
      this.subscription = undefined
      this.uploadInfo = ''
      this.selectedFilesInfo = 'None'
      this.progressTotal = 0
      this.uploadTotalInfo = '0/0'
      this.uploadCount = 0
    },
    previewFiles(event) {
      const files = event.target.files
      const total = files.length
      if (total > 1) {
        this.selectedFilesInfo = total + ' files has been selected'
        for (let i = 0; i < total; i++) {
          const file = files[i]
          this.upload(file, total)
        }
      } else {
        const file = files[0]
        this.selectedFilesInfo = file.name + ' has been selected.'
        this.upload(file, 1)
      }
      this.$refs.files.value = ''
    },
    upload(file, total) {
      getUploadToken({ fileKey: file.name }).then(response => {
        const that = this
        if (response.code === 1) {
          const token = response.data
          var observer = {
            next(res) {
              that.uploadInfo = 'Uploading file: ' + file.name + ' ...'
              that.progress = res.total.percent
            },
            error(err) {
              that.uploadInfo = 'Upload error: ' + err
            },
            complete() {
              that.uploadInfo = ''
              that.progress = 0
              that.subscription = undefined
              that.uploadCount += 1
              that.progressTotal = 100 * that.uploadCount / total
              that.uploadTotalInfo = that.uploadCount + '/' + total
              if (this.progressTotal === 100) {
                that.resetUploadData()
              }
            }
          }

          var config = {
            useCdnDomain: true,
            region: qiniu.region.z2
          }
          var putExtra = {
            fname: file.name,
            params: {},
            mimeType: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'image/svg+xml', 'image/x-icon']
          }
          const observable = qiniu.upload(file, file.name, token, putExtra, config)
          that.subscription = observable.subscribe(observer) // 上传开始
          that.insertImg(that.imgDomain + file.name)
        } else {
          pop_error(response.msg)
        }
      })
    },
    insertImg(url) {
      const cursor = this.getCursorSelectedText()
      const start = cursor.start
      const a = this.text

      const urlText = '![Untitled](' + url + ')\r\n'
      this.text = [a.slice(0, start), urlText, a.slice(start)].join('')
    },
    resetEditor() {
      this.temp = []
      this.curVersionIndex = 0
      this.text = ''
      this.x = 0
      this.y = 0
      this.lastText = ''
      this.title = ''
      this.id = 0
    },
    handleShiftTabKeyDown(e) {
      // const cursor = this.getCursorSelectedText()
      // const start = cursor.start
      // const end = cursor.end

      // const a = this.text
      // const selectedLines = this.statisticsSelected(a)
      // console.log(selectedLines)
    },
    handleTabKeyDown(e) {
      const cursor = this.getCursorSelectedText()
      const start = cursor.start
      const end = cursor.end

      let a = this.text
      const selectedLineText = a.slice(start, end)
      const selectedLines = this.statisticsSelected(selectedLineText)

      const b = ' '
      if (start === end) {
        // insert two space
        this.text = [a.slice(0, end), b + b, a.slice(end)].join('')
        this.$nextTick(() => {
          this.setCursorLocation(start + 2, start + 2)
        })
      } else {
        // multiple lines
        if (selectedLines !== 0) {
          // find the last wrap char in first line of the selected part
          // from start to 0, the index of first wrap char is what we want
          const beforeStartPosText = a.slice(0, start)
          console.log('beforeStartPosText', beforeStartPosText)
          for (let index = beforeStartPosText.length; index > -1; index--) {
            if (index === 0) {
              a = [b + b, a].join('')
            }
            const element = beforeStartPosText[index]
            const last = beforeStartPosText[index - 1]
            if (element === '\n') {
              if (last && last === '\r') {
                a = [a.slice(0, index + 1), b + b, a.slice(index + 1)].join('')
                break
              } else {
                a = [a.slice(0, index + 1), b + b, a.slice(index + 1)].join('')
                break
              }
            } else if (element === '\r') {
              a = [a.slice(0, index + 1), b + b, a.slice(index + 1)].join('')
              break
            }
          }

          // find the wrap text location
          for (let index = start; index < end; index++) {
            const element = a[index]
            // /\r\n|\r|\n/
            if (element === '\n') {
              a = [a.slice(0, index + 1), b + b, a.slice(index + 1)].join('')
            } else if (element === '\r') {
              const next = a[index + 1]
              if (next) {
                if (next === '\n') {
                  continue
                } else {
                  a = [a.slice(0, index + 1), b + b, a.slice(index + 1)].join('')
                }
              }
            } else {
              continue
            }
          }
          this.text = a
          this.$nextTick(() => {
            this.setCursorLocation(start, selectedLines * 2 + end)
          })
        } else {
          // single line
          this.text = [a.slice(0, start), b + b, a.slice(start)].join('')
          this.$nextTick(() => {
            this.setCursorLocation(start + 2, end + 2)
          })
        }
      }
    },
    assignXAndY() {
      const docStyle = document.documentElement.style
      docStyle.setProperty('--mouse-x', Number(this.x))
      docStyle.setProperty('--mouse-y', Number(this.y))
    },
    setCursorLocation(start, end) {
      const textarea = this.$refs.textEditArea
      textarea.selectionStart = start
      textarea.selectionEnd = end
    },
    getCursorSelectedText() {
      const textarea = this.$refs.textEditArea
      const cursorStartPosition = textarea.selectionStart
      const cursorEndPosition = textarea.selectionEnd

      return {
        start: cursorStartPosition,
        end: cursorEndPosition
      }
    },
    hanldeSelectedTextBold() {
      const start = this.getCursorSelectedText().start
      const end = this.getCursorSelectedText().end
      if (start === end) return
      let a = this.text
      const b = '**'
      a = [a.slice(0, end), b, a.slice(end)].join('')
      a = [a.slice(0, start), b, a.slice(start)].join('')
      this.text = a
    },
    hanldeSelectedTextItalic() {
      const start = this.getCursorSelectedText().start
      const end = this.getCursorSelectedText().end
      if (start === end) return
      let a = this.text
      const b = '*'
      a = [a.slice(0, end), b, a.slice(end)].join('')
      a = [a.slice(0, start), b, a.slice(start)].join('')
      this.text = a
    },
    handleColorChange(val) {
      this.textColor = val
      const start = this.getCursorSelectedText().start
      const end = this.getCursorSelectedText().end
      if (start === end) return
      let a = this.text
      const head = ['<span style="color: ', val, '">'].join('')
      const tail = '</span>'
      a = [a.slice(0, end), tail, a.slice(end)].join('')
      a = [a.slice(0, start), head, a.slice(start)].join('')
      this.text = a
    },
    hanldeSelectedTextColor() {},
    statistics(val) {
      this.lines = val.split(/\r\n|\r|\n/).length
      this.words = val.length
    },
    handlePreCancel() {
      this.isCancel = true
      if (this.curVersionIndex !== 0) {
        this.curVersionIndex = this.curVersionIndex - 1
        this.temp.pop()
      }
      this.text = this.temp[this.curVersionIndex]
    },
    record(val) {
      if (!this.isCancel) {
        this.temp.push(val)
        this.curVersionIndex = this.temp.length - 1
      }
      this.isCancel = false
    },
    statisticsSelected(val) {
      return val.split(/\r\n|\r|\n/).length
    },
    handleSave() {
      if (typeof this.beforeClose === 'function') {
        this.$emit('save', {
          id: this.id,
          title: this.title,
          blogSource: this.text,
          blogHtml: this.markedText,
          lines: this.lines,
          words: this.words
        })
        this.lastText = this.text
      } else {
        this.hide()
      }
    },
    updateId(id) {
      this.id = id
    },
    handleClose() {
      if (this.lastText !== this.text) {
        this.openConfirmDialog()
      } else {
        this.close()
      }
    },
    close() {
      this.$emit('update:visible', false)
      this.$emit('close')
      this.closed = true
    },
    openConfirmDialog() {
      this.$confirm('This blog has been edited, you want give it up?', '提示', {
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        type: 'warning'
      }).then(() => {
        this.close()
      }).catch(() => {
      })
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss">
@keyframes show-editor-box {
  0% {
    transform: translate(calc(var(--mouse-x)*0.5px), calc(var(--mouse-y)*1px));
    border-radius: 40px;
    width: 1200px;
    height: 10px;
  }
  100% {
    transform: translate(0, 0);
    border-radius: 0;
    width: 100%;
    height: 100%;
  }
}

.stage-box-enter-active {
  animation-name: show-editor-box;
  animation-timing-function: ease-in-out;
  animation-duration: .48s;
  animation-fill-mode: forwards;
}

.stage-box-leave-active {
  animation-name: show-editor-box;
  animation-timing-function: ease-in-out;
  animation-duration: .48s;
  animation-fill-mode: forwards;
  animation-direction: reverse;
}

#stage{
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 2000;
}
#top-action-bar{
  height: 48px;
  width: 100%;
  background-color: rgb(212, 212, 212);
  position: absolute;
  top: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
#bottom-action-bar{
  height: 24px;
  width: 100%;
  background-color: rgb(212, 212, 212);
  position: absolute;
  bottom: 0;
  display: flex;
  justify-content: left;
  align-items: center;
}

#editor {
  position: absolute;
  left: 0;
  right: 0;
  top: 48px;
  bottom: 24px;
  width: 100%;
  margin: 0;
  height: 100%;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: #333;
  #content-preview{
    background-color: rgb(223, 223, 223);
    position: fixed;
    top: 48px;
    bottom: 24px;
    right: 0;
    display: inline-block;
    width: 50%;
    vertical-align: top;
    box-sizing: border-box;
    padding: 0 20px;
    overflow: auto;
  }
  #content-editor {
    display: inline-block;
    position: fixed;
    top: 48px;
    bottom: 24px;
    left: 0;
    width: 50%;
    vertical-align: top;
    box-sizing: border-box;
  }
}

textarea {
  border: none;
  border-right: 1px solid #ccc;
  height: 100%;
  width: 100%;
  resize: none;
  outline: none;
  background-color: #ffffff;
  font-size: 14px;
  font-family: 'Monaco', courier, monospace;
  padding: 20px;
}
#top-right-action-bar{
  display: flex;
  position: absolute;
  right: 16px;
  justify-content: center;
  align-items: center;
}
#top-left-action-bar{
  display: flex;
  position: absolute;
  left: 16px;
}
.bottom-text{
  font-size: 12px;
  margin-left: 14px;
}
.top-right-box{
  margin-right: 14px;
}
.top-right-tips{
  background-color: #333
}
.custom-file-input {
  width: 0.1px;
	height: 0.1px;
	opacity: 0;
	overflow: hidden;
	position: absolute;
	z-index: -1;
}
.custom-file-input + label {
  font-size: .75em;
  font-weight: 700;
  color: white;
  display: inline-block;
}
.upload-text{
  font-size: .75em;
}
</style>
