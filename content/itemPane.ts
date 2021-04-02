declare const Zotero: IZotero
declare const ZoteroItemPane: any

import { patch as $patch$ } from './monkey-patch'

const xul = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul'

const SciteItemPane = new class { // tslint:disable-line:variable-name
  public item: any = null

  private observer: number = null

  private dom = {
    parser: new DOMParser,
    serializer: new XMLSerializer,
  }

  public async notify(action, type, ids) {
    if (!this.item || !ids.includes(this.item.id)) return

    switch (action) {
      case 'delete':
      case 'trash':
        this.item = null
        break

      case 'add':
      case 'modify':
        break
    }

    await this.refresh()
  }

  public async load() {
    this.observer = Zotero.Notifier.registerObserver(this, ['item'], 'Scite')
  }

  public async unload() {
    Zotero.Notifier.unregisterObserver(this.observer)
  }

  public async refresh() {

    const attachment_ids = this.item.getAttachments();

    let pdf_attachment = undefined
    for (let id of attachment_ids) {
      const attachment = Zotero.Items.get(id);
      if (attachment.attachmentContentType == "application/pdf")
      {
        pdf_attachment = attachment
        break
      }
    }
    let has_pdf = pdf_attachment !== undefined

    document.getElementById("message_no_pdf_attached").style.display = has_pdf ? "none" : ""
    document.getElementById("button_open_in_anot8").style.display = has_pdf ? "" : "none"


    let open_pdf_command = "return false;"
    if (pdf_attachment)
    {
      const file_name = pdf_attachment.getFilename()
      open_pdf_command = `Zotero.launchURL('http://localhost:5003/r/-1.zotero/-1?relative_file_path=storage/${pdf_attachment.key}/${file_name}'); return false;`
    }
    document.getElementById("button_open_in_anot8").setAttribute("oncommand", open_pdf_command)
  }
}

$patch$(ZoteroItemPane, 'viewItem', original => async function(item, mode, index) {
  let sciteIdx = -1

  try {
    SciteItemPane.item = item

    const tabPanels = document.getElementById('zotero-editpane-tabs')
    sciteIdx = Array.from(tabPanels.children).findIndex(child => child.id === 'zotero-editpane-scite-tab')

    SciteItemPane.refresh()
  } catch (err) {
    Zotero.logError(`Scite.ZoteroItemPane.viewItem: ${err}`)
    sciteIdx = -1
  }

  if (index !== sciteIdx) return await original.apply(this, arguments)
})

window.addEventListener('load', event => {
  SciteItemPane.load().catch(err => Zotero.logError(err))
}, false)
window.addEventListener('unload', event => {
  SciteItemPane.unload().catch(err => Zotero.logError(err))
}, false)

delete require.cache[module.id]
