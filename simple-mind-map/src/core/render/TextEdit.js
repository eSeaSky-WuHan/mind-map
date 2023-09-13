import { getStrWithBrFromHtml, checkNodeOuter } from '../../utils'
import { ERROR_TYPES } from '../../constants/constant'

//  节点文字编辑类
export default class TextEdit {
  //  构造函数
  constructor(renderer) {
    this.renderer = renderer
    this.mindMap = renderer.mindMap
    // 当前编辑的节点
    this.currentNode = null
    // 文本编辑框
    this.textEditNode = null
    // 文本编辑框是否显示
    this.showTextEdit = false
    // 如果编辑过程中缩放画布了，那么缓存当前编辑的内容
    this.cacheEditingText = ''
    this.bindEvent()
  }

  //  事件
  bindEvent() {
    this.show = this.show.bind(this)
    this.onScale = this.onScale.bind(this)
    // 节点双击事件
    this.mindMap.on('node_dblclick', this.show)
    // 点击事件
    this.mindMap.on('draw_click', () => {
      // 隐藏文本编辑框
      this.hideEditTextBox()
    })
    this.mindMap.on('body_click', () => {
      // 隐藏文本编辑框
      if (this.mindMap.opt.isEndNodeTextEditOnClickOuter) {
        this.hideEditTextBox()
      }
    })
    this.mindMap.on('svg_mousedown', () => {
      // 隐藏文本编辑框
      this.hideEditTextBox()
    })
    // 展开收缩按钮点击事件
    this.mindMap.on('expand_btn_click', () => {
      this.hideEditTextBox()
    })
    // 节点激活前事件
    this.mindMap.on('before_node_active', () => {
      this.hideEditTextBox()
    })
    // 注册编辑快捷键
    this.mindMap.keyCommand.addShortcut('F2', () => {
      if (this.renderer.activeNodeList.length <= 0) {
        return
      }
      this.show(this.renderer.activeNodeList[0])
    })
    this.mindMap.on('scale', this.onScale)
    // // 监听按键事件，判断是否自动进入文本编辑模式
    if (this.mindMap.opt.enableAutoEnterTextEditWhenKeydown) {
      window.addEventListener('keydown', e => {
        const activeNodeList = this.mindMap.renderer.activeNodeList
        if (activeNodeList.length <= 0 || activeNodeList.length > 1) return
        const node = activeNodeList[0]
        // 当正在输入中文或英文或数字时，如果没有按下组合键，那么自动进入文本编辑模式
        if (node && this.checkIsAutoEnterTextEditKey(e)) {
          this.show(node)
        }
      })
    }
  }

  // 判断是否是自动进入文本编模式的按钮
  checkIsAutoEnterTextEditKey(e) {
    const keyCode = e.keyCode
    return (
      (keyCode === 229 ||
        (keyCode >= 65 && keyCode <= 90) ||
        (keyCode >= 48 && keyCode <= 57)) &&
      !this.mindMap.keyCommand.hasCombinationKey(e)
    )
  }

  //  注册临时快捷键
  registerTmpShortcut() {
    // 注册回车快捷键
    this.mindMap.keyCommand.addShortcut('Enter', () => {
      this.hideEditTextBox()
    })
    this.mindMap.keyCommand.addShortcut('Tab', () => {
      this.hideEditTextBox()
    })
  }

  //  显示文本编辑框
  // isInserting：是否是刚创建的节点
  async show(node, e, isInserting = false) {
    // 使用了自定义节点内容那么不响应编辑事件
    if (node.isUseCustomNodeContent()) {
      return
    }
    let { beforeTextEdit } = this.mindMap.opt
    if (typeof beforeTextEdit === 'function') {
      let isShow = false
      try {
        isShow = await beforeTextEdit(node, isInserting)
      } catch (error) {
        isShow = false
        this.mindMap.opt.errorHandler(ERROR_TYPES.BEFORE_TEXT_EDIT_ERROR, error)
      }
      if (!isShow) return
    }
    this.currentNode = node
    let { offsetLeft, offsetTop } = checkNodeOuter(this.mindMap, node)
    this.mindMap.view.translateXY(offsetLeft, offsetTop)
    let rect = node._textData.node.node.getBoundingClientRect()
    if (this.mindMap.richText) {
      this.mindMap.richText.showEditText(node, rect, isInserting)
      return
    }
    this.showEditTextBox(node, rect, isInserting)
  }

  // 处理画布缩放
  onScale() {
    if (!this.currentNode) return
    if (this.mindMap.richText) {
      this.mindMap.richText.cacheEditingText =
        this.mindMap.richText.getEditText()
      this.mindMap.richText.showTextEdit = false
    } else {
      this.cacheEditingText = this.getEditText()
      this.showTextEdit = false
    }
    this.show(this.currentNode)
  }

  //  显示文本编辑框
  showEditTextBox(node, rect, isInserting) {
    if (this.showTextEdit) return
    this.mindMap.emit('before_show_text_edit')
    this.registerTmpShortcut()
    if (!this.textEditNode) {
      this.textEditNode = document.createElement('div')
      this.textEditNode.style.cssText = `position:fixed;box-sizing: border-box;padding: 3px 5px;margin-left: -5px;margin-top: -3px;outline: none; word-break: break-all;`
      this.textEditNode.setAttribute('contenteditable', true)
      this.textEditNode.addEventListener('keyup', e => {
        e.stopPropagation()
      })
      this.textEditNode.addEventListener('click', e => {
        e.stopPropagation()
      })
      this.textEditNode.addEventListener('mousedown', e => {
        e.stopPropagation()
      })
      this.textEditNode.addEventListener('keydown', e => {
        if (this.checkIsAutoEnterTextEditKey(e)) {
          e.stopPropagation()
        }
      })
      const targetNode =
        this.mindMap.opt.customInnerElsAppendTo || document.body
      targetNode.appendChild(this.textEditNode)
    }
    let scale = this.mindMap.view.scale
    let lineHeight = node.style.merge('lineHeight')
    let fontSize = node.style.merge('fontSize')
    let textLines = (this.cacheEditingText || node.nodeData.data.text).split(
      /\n/gim
    )
    let isMultiLine = node._textData.node.attr('data-ismultiLine') === 'true'
    node.style.domText(this.textEditNode, scale, isMultiLine)
    this.textEditNode.style.zIndex = this.mindMap.opt.nodeTextEditZIndex
    this.textEditNode.innerHTML = textLines.join('<br>')
    this.textEditNode.style.minWidth = rect.width + 10 + 'px'
    this.textEditNode.style.minHeight = rect.height + 6 + 'px'
    this.textEditNode.style.left = rect.left + 'px'
    this.textEditNode.style.top = rect.top + 'px'
    this.textEditNode.style.display = 'block'
    this.textEditNode.style.maxWidth =
      this.mindMap.opt.textAutoWrapWidth * scale + 'px'
    if (isMultiLine && lineHeight !== 1) {
      this.textEditNode.style.transform = `translateY(${
        -((lineHeight * fontSize - fontSize) / 2) * scale
      }px)`
    }
    // 将文本编辑框背景色设为节点背景色
    if (node.style.merge('fillColor') === 'transparent') {
      this.textEditNode.style.backgroundColor =
          node.style.themeConfig.backgroundColor
    } else {
      this.textEditNode.style.backgroundColor = node.style.merge('fillColor')
    }
    // 设置编辑时文字颜色
    this.textEditNode.style.color = node.style.merge('color')
    this.showTextEdit = true
    // 选中文本
    // if (!this.cacheEditingText) {
    //   this.selectNodeText()
    // }
    if (isInserting) {
      this.selectNodeText()
    } else {
      this.focus()
    }
    this.cacheEditingText = ''
    this.textEditNode.addEventListener('input', this.textChange.bind(this))
  }
// 计算节点外框的宽高
  textChange() {
    if(!this.showTextEdit){
      return
    }
    const node = this.currentNode
    const el = this.textEditNode
    // 获取节点标签
    const rect = node.group.find('.smm-node-shape')
    // 计算除文字以外内容的宽度和高度
    const otherWidth =
        node._rectInfo.textContentWidth -
        node._textData.node.node.getBoundingClientRect().width
    const otherHeight = node.height - node._rectInfo.textContentHeight
    const maxContentWidth = Math.max(
        otherWidth + el.clientWidth,
    )
    let paddingX
    if (node.nodeData.data.paddingX !== undefined) {
      paddingX = node.nodeData.data.paddingX
    } else {
      paddingX = this.mindMap.themeConfig.paddingX
    }
    // 更新节点宽高
    if (maxContentWidth+paddingX * 2 > node.width) {
      rect.width(maxContentWidth + paddingX * 2)
    }
    if (otherHeight + el.clientHeight > node.height) {
      rect.height(otherHeight + el.clientHeight)
    }
  }
  // 聚焦
  focus() {
    let selection = window.getSelection()
    let range = document.createRange()
    range.selectNodeContents(this.textEditNode)
    range.collapse()
    selection.removeAllRanges()
    selection.addRange(range)
  }

  //  选中文本
  selectNodeText() {
    let selection = window.getSelection()
    let range = document.createRange()
    range.selectNodeContents(this.textEditNode)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  // 获取当前正在编辑的内容
  getEditText() {
    return getStrWithBrFromHtml(this.textEditNode.innerHTML)
  }

  //  隐藏文本编辑框
  hideEditTextBox() {
    this.currentNode = null
    if (this.mindMap.richText) {
      return this.mindMap.richText.hideEditText()
    }
    if (!this.showTextEdit) {
      return
    }
    this.renderer.activeNodeList.forEach(node => {
      let str = this.getEditText()
      this.mindMap.execCommand('SET_NODE_TEXT', node, str)
      if (node.isGeneralization) {
        // 概要节点
        node.generalizationBelongNode.updateGeneralization()
      }
      this.mindMap.render()
    })
    this.mindMap.emit(
      'hide_text_edit',
      this.textEditNode,
      this.renderer.activeNodeList
    )
    this.textEditNode.style.display = 'none'
    this.textEditNode.innerHTML = ''
    this.textEditNode.style.fontFamily = 'inherit'
    this.textEditNode.style.fontSize = 'inherit'
    this.textEditNode.style.fontWeight = 'normal'
    this.textEditNode.style.transform = 'translateY(0)'
    this.showTextEdit = false
  }
}
