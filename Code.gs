function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Vangst & Vlees van Dijk')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

var store = PropertiesService.getScriptProperties();

function getAllData() {
  var p = store.getProperty('products');
  var o = store.getProperty('orders');
  var s = store.getProperty('settings');
  return {
    productsData: p ? JSON.parse(p) : { products: [], weekLabel: '' },
    orders:       o ? JSON.parse(o) : [],
    settings:     s ? JSON.parse(s) : { gesloten: false, emailAdressen: [] }
  };
}

function saveProducts(data) {
  store.setProperty('products', JSON.stringify(data));
  return { ok: true };
}

function addOrder(order) {
  // Stap 1: opslaan
  try {
    var o = store.getProperty('orders');
    var orders = o ? JSON.parse(o) : [];
    orders.push(order);
    store.setProperty('orders', JSON.stringify(orders));
  } catch(e) {
    return { ok: false, error: e.message };
  }

  // Stap 2: mail naar beheerder
  try {
    var s = store.getProperty('settings');
    var settings = s ? JSON.parse(s) : {};
    var beheerderMails = settings.emailAdressen || [];
    if (beheerderMails.length > 0) {
      var tekst = 'Naam: ' + (order.naam||'') + '\n'
        + 'Telefoon: ' + (order.tel||'') + '\n'
        + 'Email: ' + (order.email||'-') + '\n'
        + 'Datum: ' + (order.datum||'') + ' ' + (order.tijd||'') + '\n\n'
        + 'Producten:\n';
      var items = order.items || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i]) tekst += (items[i].artikel||'') + ' | ' + (items[i].omschrijving||'') + ' | ' + (items[i].qty||'') + 'x\n';
      }
      if (order.notitie) tekst += '\nOpmerking: ' + order.notitie;
      tekst += '\n\n* Prijzen kunnen afwijken op basis van werkelijk gewicht.';
      MailApp.sendEmail(beheerderMails.join(','), 'Nieuwe bestelling ' + (order.week||'') + ' - ' + (order.naam||''), tekst);
    }
  } catch(e) {
    Logger.log('Beheerder mail error: ' + e.message);
  }

  // Stap 3: bevestigingsmail naar klant
  try {
    if (order.email) {
      var items2 = order.items || [];
      var klantTekst = 'Beste ' + (order.naam||'') + ',\n\nJe bestelling is ontvangen.\n\nProducten:\n';
      for (var j = 0; j < items2.length; j++) {
        if (items2[j]) klantTekst += (items2[j].artikel||'') + ' | ' + (items2[j].omschrijving||'') + ' | ' + (items2[j].qty||'') + 'x\n';
      }
      klantTekst += '\nOphalen op dinsdag. Betaal via Tikkie na ontvangst van de factuur.\n\nMet vriendelijke groet,\nVangst & Vlees van Dijk';
      MailApp.sendEmail(order.email, 'Bevestiging bestelling ' + (order.week||''), klantTekst);
    }
  } catch(e) {
    Logger.log('Klant mail error: ' + e.message);
  }

  return { ok: true };
}

function updateOrder(order) {
  try {
    var o = store.getProperty('orders');
    var orders = o ? JSON.parse(o) : [];
    var found = false;
    for (var i = 0; i < orders.length; i++) {
      if (orders[i] && String(orders[i].id) === String(order.id)) {
        orders[i] = order; found = true; break;
      }
    }
    if (!found) orders.push(order);
    store.setProperty('orders', JSON.stringify(orders));
  } catch(e) {}
  return { ok: true };
}

function saveOrders(orders) {
  store.setProperty('orders', JSON.stringify(orders));
  return { ok: true };
}

function saveSettings(settings) {
  store.setProperty('settings', JSON.stringify(settings));
  return { ok: true };
}

function deleteOrders() {
  store.setProperty('orders', JSON.stringify([]));
  return { ok: true };
}

function stuurFactuurMail(data) {
  try {
    MailApp.sendEmail(data.email, 'Factuur ' + data.week, data.body);
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

function verstuurBestellingenMail() {
  try {
    var o = store.getProperty('orders');
    var orders = o ? JSON.parse(o) : [];
    var p = store.getProperty('products');
    var weekLabel = p ? (JSON.parse(p).weekLabel || '') : '';
    var s = store.getProperty('settings');
    var settings = s ? JSON.parse(s) : {};
    var emailAdressen = settings.emailAdressen || [];

    if (!emailAdressen.length) return { ok: false, error: 'Geen e-mailadressen' };
    if (!orders.length) return { ok: false, error: 'Geen bestellingen' };

    var tekst = 'Bestellingenoverzicht ' + weekLabel + '\nAantal: ' + orders.length + '\n\n';
    for (var i = 0; i < orders.length; i++) {
      var ord = orders[i];
      if (!ord) continue;
      tekst += (ord.naam||'') + ' (' + (ord.tel||'') + ')' + (ord.email ? ' - ' + ord.email : '') + '\n';
      var items = ord.items || [];
      for (var j = 0; j < items.length; j++) {
        if (items[j]) tekst += '  ' + (items[j].artikel||'') + ' | ' + (items[j].omschrijving||'') + ' | ' + (items[j].qty||'') + 'x\n';
      }
      if (ord.notitie) tekst += '  Opmerking: ' + ord.notitie + '\n';
      tekst += '\n';
    }

    MailApp.sendEmail(emailAdressen.join(','), 'Bestellingen ' + weekLabel, tekst);
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}
