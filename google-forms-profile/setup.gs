/** Googleフォームから履歴書を作成し、回答者へPDFのコピーを送ります。 */
const RESUME_FIELDS = [
  ['氏名', false, true],
  ['ふりがな', false, true],
  ['メールアドレス', false, true],
  ['生年月日', false, false],
  ['居住地', false, false],
  ['希望職種', false, false],
  ['学歴・職歴', true, true],
  ['資格・スキル', true, false],
  ['活動リンク', false, false],
  ['自己PR', true, true],
  ['志望動機', true, true]
];

function setupAutomation() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const config = book.getSheetByName('設定');
  if (!config) throw new Error('設定シートがありません。配布用スプレッドシートをコピーしてください。');
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('BOOK_ID') === book.getId() && properties.getProperty('FORM_ID')) {
    config.getRange('B10').setValue('初期設定済み');
    console.log('初期設定済みです。設定シートの回答フォームURLからテストしてください。');
    return;
  }
  const folderValue = config.getRange('B6').getDisplayValue().trim();
  const root = folderValue
    ? DriveApp.getFolderById(extractId_(folderValue))
    : DriveApp.createFolder('フォーム履歴書');
  const sourceUrl = config.getRange('B7').getDisplayValue().trim();
  if (!sourceUrl) throw new Error('設定シートB7へ履歴書テンプレートのURLを入力してください。');
  const template = DriveApp.getFileById(extractId_(sourceUrl)).makeCopy('履歴書テンプレート（使用中）', root);
  const output = root.createFolder('生成された履歴書');
  DriveApp.getFileById(book.getId()).moveTo(root);
  book.setSpreadsheetTimeZone('Asia/Tokyo');
  book.setSpreadsheetLocale('ja_JP');
  const form = FormApp.create('履歴書作成フォーム', false);
  form.setDescription('回答内容から履歴書を作成し、入力したメールアドレスへPDFとGoogleドキュメントのリンクを送ります。');
  form.setConfirmationMessage('送信を受け付けました。履歴書のコピーをメールでお送りします。');
  RESUME_FIELDS.forEach(function (field) {
    const item = field[1] ? form.addParagraphTextItem() : form.addTextItem();
    item.setTitle(field[0]).setRequired(field[2]);
    if (field[0] === 'メールアドレス') {
      item.setHelpText('履歴書のコピーを受け取るメールアドレス');
      item.setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
    }
    if (field[0] === '生年月日') item.setHelpText('例：2000年1月1日');
    if (field[0] === '活動リンク') item.setHelpText('ポートフォリオや活動先のURLを1つ入力してください。');
  });
  form.setDestination(FormApp.DestinationType.SPREADSHEET, book.getId());
  DriveApp.getFileById(form.getId()).moveTo(root);
  SpreadsheetApp.flush();
  const response = book.getSheets().find(function (sheet) {
    return sheet.getFormUrl() !== null;
  });
  if (!response) throw new Error('回答先シートを確認できませんでした。設定を確認してください。');
  const metadata = ['履歴書URL', 'PDF URL', '処理状態', '送信日時', 'エラー内容'];
  response.getRange(1, response.getLastColumn() + 1, 1, metadata.length).setValues([metadata]);
  properties.setProperties({
    BOOK_ID: book.getId(), FORM_ID: form.getId(), TEMPLATE_ID: template.getId(),
    OUTPUT_ID: output.getId(), RESPONSE_SHEET_ID: String(response.getSheetId())
  });
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'onFormSubmit') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(book).onFormSubmit().create();
  form.setPublished(true);
  config.getRange('B6').setValue(root.getUrl());
  config.getRange('B10:B16').setValues([
    ['初期設定済み'], [form.getEditUrl()], [form.getPublishedUrl()], [output.getUrl()],
    [template.getUrl()], [response.getName()], ['テスト回答を送信してください']
  ]);
  console.log('初期設定が完了しました。回答フォーム：' + form.getPublishedUrl());
}

function onFormSubmit(e) {
  if (!e || !e.range || !e.namedValues) {
    throw new Error('フォームの回答画面から送信してテストしてください。');
  }
  const properties = PropertiesService.getScriptProperties();
  const sheet = e.range.getSheet();
  const book = sheet.getParent();
  if (book.getId() !== properties.getProperty('BOOK_ID') ||
      String(sheet.getSheetId()) !== properties.getProperty('RESPONSE_SHEET_ID')) return;
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    const row = e.range.getRow();
    const cell = function (title) {
      const index = headers.indexOf(title);
      if (index < 0) throw new Error('管理列がありません：' + title);
      return sheet.getRange(row, index + 1);
    };
    const state = cell('処理状態').getDisplayValue();
    if (state === '送信済み' || state === '送信中') return;
    cell('処理状態').setValue('作成中');
    const answers = {};
    RESUME_FIELDS.forEach(function (field) {
      answers[field[0]] = String((e.namedValues[field[0]] || [''])[0]);
    });
    const email = answers['メールアドレス'].trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('メールアドレスを確認してください。');
    const now = new Date();
    answers['作成日'] = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy年M月d日');
    const title = '履歴書_' + answers['氏名'].replace(/[\r\n]/g, '') + '_' + Utilities.formatDate(now, 'Asia/Tokyo', 'yyyyMMdd_HHmmss');
    const output = DriveApp.getFolderById(properties.getProperty('OUTPUT_ID'));
    const copied = DriveApp.getFileById(properties.getProperty('TEMPLATE_ID')).makeCopy(title, output);
    const doc = DocumentApp.openById(copied.getId());
    const body = doc.getBody();
    Object.keys(answers).forEach(function (key) {
      body.replaceText(escapePattern_('{{' + key + '}}'), answers[key]);
    });
    doc.saveAndClose();
    const ownerEmail = Session.getEffectiveUser().getEmail();
    if (email.toLowerCase() !== ownerEmail.toLowerCase()) copied.addViewer(email);
    const pdf = copied.getAs(MimeType.PDF).setName(title + '.pdf');
    const pdfFile = output.createFile(pdf);
    cell('履歴書URL').setValue(copied.getUrl());
    cell('PDF URL').setValue(pdfFile.getUrl());
    const config = book.getSheetByName('設定');
    if (config.getRange('B8').getDisplayValue() === '有効') {
      cell('処理状態').setValue('送信中');
      SpreadsheetApp.flush();
      GmailApp.sendEmail(email, '【履歴書作成】履歴書のコピーをお送りします',
        answers['氏名'] + ' 様\n\nフォームへのご入力ありがとうございます。\n履歴書のコピーをPDFで添付しました。\n\nGoogleドキュメントでも確認できます。\n' + copied.getUrl() +
        '\n\n内容を確認し、必要に応じてご自身のDriveにコピーしてご利用ください。',
        { name: '履歴書作成フォーム', attachments: [pdf] });
      cell('送信日時').setValue(new Date()).setNumberFormat('yyyy/mm/dd hh:mm:ss');
      cell('処理状態').setValue('送信済み');
      config.getRange('B16').setValue('履歴書・PDFを作成し、回答者へメール送信しました');
    } else {
      cell('処理状態').setValue('作成済み（メール停止）');
      config.getRange('B16').setValue('履歴書・PDFを作成しました（メール停止）');
    }
  } catch (error) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    const index = headers.indexOf('エラー内容');
    if (index >= 0) sheet.getRange(e.range.getRow(), index + 1).setValue(String(error.message || error));
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function extractId_(value) {
  const match = String(value).match(/[-\w]{25,}/);
  if (!match) throw new Error('Google DriveのURLまたはIDを確認してください。');
  return match[0];
}

function escapePattern_(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 公開用テンプレートを最初に作るときだけ使用します。 */
function prepareTemplate() {
  const url = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('設定').getRange('B7').getDisplayValue();
  const doc = DocumentApp.openById(extractId_(url));
  const body = doc.getBody();
  if (body.getText().trim()) throw new Error('内容がある文書は変更しません。空のテンプレートを指定してください。');
  body.setPageWidth(595.28).setPageHeight(841.89).setMarginTop(32).setMarginBottom(32).setMarginLeft(36).setMarginRight(36);
  body.setAttributes({ [DocumentApp.Attribute.FONT_FAMILY]: 'Arial', [DocumentApp.Attribute.FONT_SIZE]: 11 });
  body.appendParagraph('履歴書').setAlignment(DocumentApp.HorizontalAlignment.CENTER).editAsText().setBold(true).setFontSize(22);
  body.appendParagraph('作成日：{{作成日}}').setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  const sections = [
    ['基本情報', ['氏名', 'ふりがな', '生年月日', 'メールアドレス', '居住地', '希望職種']],
    ['学歴・職歴とスキル', ['学歴・職歴', '資格・スキル', '活動リンク']],
    ['自己PR・志望動機', ['自己PR', '志望動機']]
  ];
  sections.forEach(function (section) {
    const heading = body.appendParagraph(section[0]);
    heading.setSpacingBefore(10).setSpacingAfter(4).editAsText().setBold(true).setFontSize(12);
    const table = body.appendTable(section[1].map(function (key) { return [key, '{{' + key + '}}']; }));
    table.setBorderColor('#444444').setBorderWidth(0.75);
    table.setColumnWidth(0, 108).setColumnWidth(1, 409);
    for (let row = 0; row < table.getNumRows(); row++) {
      table.getCell(row, 0).editAsText().setBold(true);
      for (let column = 0; column < 2; column++) {
        table.getCell(row, column).setPaddingTop(7).setPaddingBottom(7).setPaddingLeft(7).setPaddingRight(7);
      }
    }
  });
  body.editAsText().setBold(false).setFontSize(11);
  body.getParagraphs().forEach(function (paragraph) {
    const text = paragraph.getText();
    if (text === '履歴書') paragraph.editAsText().setBold(true).setFontSize(22);
    if (sections.some(function (section) { return section[0] === text; })) {
      paragraph.editAsText().setBold(true).setFontSize(12);
    }
  });
  doc.saveAndClose();
  console.log('枠付きの履歴書テンプレートを作成しました。');
}

function stopDemo() {
  const id = PropertiesService.getScriptProperties().getProperty('FORM_ID');
  FormApp.openById(id).setAcceptingResponses(false);
  console.log('サンプルフォームの受付を停止しました。');
}
