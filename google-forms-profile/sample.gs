function onFormSubmit(e) {
  const TEMPLATE_DOC_ID = 'YOUR_TEMPLATE_DOC_ID';
  const SAVE_FOLDER_ID = 'YOUR_SAVE_FOLDER_ID';

  if (!e || !e.range || !e.values) {
    throw new Error(
      '回答先スプレッドシートのフォーム送信トリガーから実行してください。'
    );
  }

  const sheet = e.range.getSheet();
  const header = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  const rowData = e.values;

  function getPartial(keyword) {
    const matches = [];

    for (let i = 0; i < header.length; i++) {
      if (header[i].toLowerCase().includes(keyword.toLowerCase())) {
        matches.push(i);
      }
    }

    if (matches.length !== 1) {
      throw new Error('質問を一意に特定できません: ' + keyword);
    }

    return String(rowData[matches[0]] || '');
  }

  // 配列の順番と、テンプレートの行の順番をそろえる
  const fields = [
    { keyword: 'Your Name', link: false },
    { keyword: 'Nick Name', link: false },
    { keyword: 'Country of residence', link: false },
    { keyword: 'YouTube channel', link: true },
    { keyword: 'Self-Introduction', link: true },
    { keyword: 'Motivation', link: false }
  ];

  const answers = fields.map(function (field) {
    return getPartial(field.keyword);
  });

  const numberStr = String(e.range.getRow() - 1).padStart(3, '0');

  const copiedFile = DriveApp.getFileById(TEMPLATE_DOC_ID).makeCopy(
    'data' + numberStr,
    DriveApp.getFolderById(SAVE_FOLDER_ID)
  );

  const doc = DocumentApp.openById(copiedFile.getId());

  try {
    const table = doc.getBody().getTables()[0];

    if (!table || table.getNumRows() !== fields.length) {
      throw new Error(
        'テンプレートの先頭に2列6行の表を用意してください。'
      );
    }

    for (let row = 0; row < fields.length; row++) {
      if (table.getRow(row).getNumCells() !== 2) {
        throw new Error(
          '表の各行はセルを結合せず2列にしてください。'
        );
      }
    }

    fields.forEach(function (field, row) {
      const value = answers[row];
      const cell = table.getCell(row, 1);

      cell.setText(value);

      if (value) {
        const text = cell.editAsText();
        text.setBold(true);

        if (field.link && /^https?:\/\//i.test(value)) {
          text.setLinkUrl(value);
        }
      }
    });
  } finally {
    doc.saveAndClose();
  }

  Logger.log('作成したドキュメントURL: ' + copiedFile.getUrl());
}
