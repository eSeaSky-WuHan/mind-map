import JsPDF from 'jspdf'

//  导出PDF插件，需要通过Export插件使用
class ExportPDF {
  //  构造函数
  constructor(opt) {
    this.mindMap = opt.mindMap
  }

  //  导出为pdf
  pdf(name, img, useMultiPageExport = false) {
    if (useMultiPageExport) {
      this.multiPageExport(name, img)
    } else {
      this.onePageExport(name, img)
    }
  }

  // 单页导出
  onePageExport(name, img) {
    let pdf = new JsPDF('', 'pt', 'a4')
    let a4Width = 595
    let a4Height = 841
    let a4Ratio = a4Width / a4Height
    let image = new Image()
    image.onload = () => {
      let imageWidth = image.width
      let imageHeight = image.height
      let imageRatio = imageWidth / imageHeight
      let w, h
      if (imageWidth <= a4Width && imageHeight <= a4Height) {
        // 使用图片原始宽高
        w = imageWidth
        h = imageHeight
      } else if (a4Ratio > imageRatio) {
        // 以a4Height为高度，缩放图片宽度
        w = imageRatio * a4Height
        h = a4Height
      } else {
        // 以a4Width为宽度，缩放图片高度
        w = a4Width
        h = a4Width / imageRatio
      }
      pdf.addImage(img, 'PNG', (a4Width - w) / 2, (a4Height - h) / 2, w, h)
      pdf.save(name)
    }
    image.src = img
  }

  // 多页导出
  multiPageExport(name, img) {
    let image = new Image()
    const a4Width = 592.28
    const a4Height = 841.89
    image.onload = () => {
      let imageWidth = image.width
      let imageHeight = image.height
      // 一页pdf显示高度
      let pageHeight = (imageWidth / a4Width) * a4Height
      // 未生成pdf的高度
      let leftHeight = imageHeight
      // 偏移
      let position = 0
      // a4纸的尺寸[595.28,841.89]，图片在pdf中图片的宽高
      let imgWidth = a4Width
      let imgHeight = (a4Width / imageWidth) * imageHeight
      let pdf = new JsPDF('', 'pt', 'a4')
      // 有两个高度需要区分，一个是图片的实际高度，和生成pdf的页面高度(841.89)
      // 当内容未超过pdf一页显示的范围，无需分页
      if (leftHeight < pageHeight) {
        pdf.addImage(
          img,
          'PNG',
          (a4Width - imgWidth) / 2,
          (a4Height - imgHeight) / 2,
          imgWidth,
          imgHeight
        )
      } else {
        // 分页
        while (leftHeight > 0) {
          pdf.addImage(img, 'PNG', 0, position, imgWidth, imgHeight)
          leftHeight -= pageHeight
          position -= a4Height
          // 避免添加空白页
          if (leftHeight > 0) {
            pdf.addPage()
          }
        }
      }
      pdf.save(name)
    }
    image.src = img
  }
}

ExportPDF.instanceName = 'doExportPDF'

export default ExportPDF
