/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT FOR RAW MATERIAL SALE FMS
 * SHEET NAME: "FMS"
 * =========================================================================================
 * 
 * Ye Apps Script code aapke Google Sheet ke "FMS" tab ke 27 headings ke hisab se data ko 
 * manage aur update karega.
 * 
 * Row 6: Column Headers (Timestamp, Order No., etc.)
 * Row 7+: Actual Data Rows
 * 
 * Actions supported:
 * 1. CREATE_ORDER: Columns A to J me naya record write karega.
 * 2. UPDATE_LOGISTICS: Order No. search karke Columns K to V me dispatch details aur delay update karega.
 * 3. UPDATE_INVOICE: Order No. search karke Columns W to AA me invoice details aur delay update karega.
 */

/**
 * HTTP POST request handles order creation, logistics update, and billing.
 */
function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action || "CREATE_ORDER";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // ==========================================
    // USER ACTIONS FOR LOGIN TAB
    // ==========================================
    if (action === "SAVE_USER" || action === "DELETE_USER") {
      var targetSheetName = "Login";
      var loginSheet = ss.getSheetByName(targetSheetName);
      if (!loginSheet) {
        // Create Login sheet if not exists
        loginSheet = ss.insertSheet(targetSheetName);
        loginSheet.appendRow(["User Name", "Password", "Role"]);
      }
      
      var userName = postData.user_name || "";
      
      if (!userName) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "error", 
          message: "User Name is required." 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var lastRow = loginSheet.getLastRow();
      var foundRow = -1;
      if (lastRow >= 2) {
        var userNames = loginSheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < userNames.length; i++) {
          if (userNames[i][0].toString().trim().toLowerCase() === userName.toString().trim().toLowerCase()) {
            foundRow = i + 2;
            break;
          }
        }
      }
      
      if (action === "SAVE_USER") {
        var password = postData.password || "";
        var role = postData.role || "Sales";
        var firmName = postData.firm_name || "";
        
        if (foundRow !== -1) {
          loginSheet.getRange(foundRow, 2).setValue(password);
          loginSheet.getRange(foundRow, 3).setValue(role);
          loginSheet.getRange(foundRow, 4).setValue(firmName);
        } else {
          loginSheet.appendRow([userName, password, role, firmName]);
        }
        
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          message: "User saved successfully"
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        // DELETE_USER
        if (foundRow !== -1) {
          loginSheet.deleteRow(foundRow);
          return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            message: "User deleted successfully"
          })).setMimeType(ContentService.MimeType.JSON);
        } else {
          return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: "User not found"
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    
    var sheetName = "FMS";
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Sheet '" + sheetName + "' nahi mili. Please is naam ki sheet banayein." 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ==========================================
    // ACTION 1: CREATE SALE ORDER (A to J)
    // ==========================================
    if (action === "CREATE_ORDER") {
      var timestamp = new Date(); // Col A
      var orderNo = postData.order_no || ""; // Col B
      var firmName = postData.firm_name || ""; // Col C
      var partyName = postData.party_name || ""; // Col D
      var productName = postData.product_name || ""; // Col E
      var qty = postData.qty || 0; // Col F
      var rate = postData.rate || 0; // Col G
      var transportType = postData.transport_type || ""; // Col H
      var dispatchDate = postData.dispatch_date || ""; // Col I
      
      // Upload PO file to Google Drive if base64 data is present
      var poCopyUrl = postData.po_copy_url || "";
      if (postData.po_file_base64 && postData.po_file_name) {
        var driveUrl = uploadToGoogleDrive(
          postData.po_file_base64,
          postData.po_file_name,
          postData.po_file_type || "application/octet-stream"
        );
        if (driveUrl) {
          poCopyUrl = driveUrl;
        }
      }
      
      // Full row (27 columns array for columns A to AA)
      var newRow = new Array(27).fill("");
      newRow[0] = timestamp;
      newRow[1] = orderNo;
      newRow[2] = firmName;
      newRow[3] = partyName;
      newRow[4] = productName;
      newRow[5] = qty;
      newRow[6] = rate;
      newRow[7] = transportType;
      newRow[8] = dispatchDate ? new Date(dispatchDate) : "";
      newRow[9] = poCopyUrl;
      
      // Target row logic (Row 6 headers, data starts from Row 7)
      var lastRow = sheet.getLastRow();
      var targetRow = lastRow < 6 ? 7 : lastRow + 1;
      
      sheet.getRange(targetRow, 1, 1, 27).setValues([newRow]);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Order RM registered successfully at row " + targetRow,
        row_inserted: targetRow
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ==========================================
    // ACTION 2: UPDATE LOGISTICS (K to V)
    // ==========================================
    else if (action === "UPDATE_LOGISTICS") {
      var orderNo = postData.order_no || "";
      if (!orderNo) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "error", 
          message: "Order No. is missing in request." 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var rowIndex = findRowIndexByOrderNo(sheet, orderNo);
      if (rowIndex === -1) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "error", 
          message: "Order not found in Sheet: " + orderNo 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Planned Dispatch Date Column I (index 9) se read karein
      var plannedDispatchVal = sheet.getRange(rowIndex, 9).getValue();
      var actualDispatchDate = new Date();
      var delayDays = calculateDelayDays(plannedDispatchVal, actualDispatchDate);
      
      var transportTypeVal = postData.transport_type || sheet.getRange(rowIndex, 8).getValue(); // Col H value
      if (postData.transport_type) {
        sheet.getRange(rowIndex, 8).setValue(postData.transport_type);
      }
      var transporterName = postData.transporter_name || "";
      var truckNo = postData.truck_no || "";
      var biltyNo = postData.bilty_no || "";
      var actualTruckQty = postData.actual_truck_qty || 0;
      var biltyCopy = postData.bilty_copy_url || "";
      if (postData.bilty_file_base64 && postData.bilty_file_name) {
        var driveUrl = uploadToGoogleDrive(
          postData.bilty_file_base64,
          postData.bilty_file_name,
          postData.bilty_file_type || "application/octet-stream"
        );
        if (driveUrl) {
          biltyCopy = driveUrl;
        }
      }
      var rateType = postData.rate_type || "";
      var rateValue = parseFloat(postData.rate_value) || 0;
      
      var fixedAmount = rateType === "Fixed" ? rateValue : "";
      var perMtRate = rateType === "Per MT" ? rateValue : "";
      
      // Set values for columns L to V (Columns 12 to 22)
      var logisticsValues = [
        actualDispatchDate, // L: Actual
        delayDays,          // M: Delay
        transportTypeVal,   // N: Type Of Transporting.
        transporterName,    // O: Transporter Name
        truckNo,            // P: Truck No.
        biltyNo,            // Q: Bilty No.
        actualTruckQty,     // R: Actual Truck Qty
        biltyCopy,          // S: Bilty Copy
        rateType,           // T: Type Of Rate
        fixedAmount,        // U: Fixed Amount
        perMtRate           // V: Per Mt Rate
      ];
      
      sheet.getRange(rowIndex, 12, 1, 11).setValues([logisticsValues]);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Logistics details updated successfully in sheet for " + orderNo
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ==========================================
    // ACTION 3: UPDATE BILLING/INVOICE (W to AA)
    // ==========================================
    else if (action === "UPDATE_INVOICE") {
      var orderNo = postData.order_no || "";
      if (!orderNo) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "error", 
          message: "Order No. is missing in request." 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var rowIndex = findRowIndexByOrderNo(sheet, orderNo);
      if (rowIndex === -1) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "error", 
          message: "Order not found in Sheet: " + orderNo 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var actualInvoiceDate = new Date();
      var invoiceNo = postData.invoice_no || "";
      var invoiceCopy = postData.invoice_copy_url || "";
      
      // Upload Invoice file to Google Drive if base64 data is present
      if (postData.invoice_file_base64 && postData.invoice_file_name) {
        var driveUrl = uploadToGoogleDrive(
          postData.invoice_file_base64,
          postData.invoice_file_name,
          postData.invoice_file_type || "application/octet-stream"
        );
        if (driveUrl) {
          invoiceCopy = driveUrl;
        }
      }
      
      // Set values only for columns X (Actual.), Z (Invoice No.), and AA (Invoice Copy)
      sheet.getRange(rowIndex, 24).setValue(actualInvoiceDate); // X: Actual.
      sheet.getRange(rowIndex, 26).setValue(invoiceNo);          // Z: Invoice No.
      sheet.getRange(rowIndex, 27).setValue(invoiceCopy);        // AA: Invoice Copy
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Invoice details updated successfully in sheet for " + orderNo
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: "Server Error: " + error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper to find row index by matching Order No. in Column B (Index 2).
 */
function findRowIndexByOrderNo(sheet, orderNo) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 7) return -1;
  
  // Col B is Column 2 (Order No.)
  var range = sheet.getRange(7, 2, lastRow - 6, 1);
  var values = range.getValues();
  
  for (var i = 0; i < values.length; i++) {
    if (values[i][0].toString().trim() === orderNo.toString().trim()) {
      return i + 7; // Index to Sheet Row (starts at Row 7)
    }
  }
  return -1;
}

/**
 * Helper to calculate delay in days between planned and actual dates.
 */
function calculateDelayDays(plannedVal, actualVal) {
  if (!plannedVal || !actualVal) return 0;
  
  var planned = (plannedVal instanceof Date) ? plannedVal : new Date(plannedVal);
  var actual = (actualVal instanceof Date) ? actualVal : new Date(actualVal);
  
  if (isNaN(planned.getTime()) || isNaN(actual.getTime())) return 0;
  
  planned.setHours(0,0,0,0);
  actual.setHours(0,0,0,0);
  
  var diffTime = actual.getTime() - planned.getTime();
  var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * HTTP GET request allows checking sheet data as JSON.
 * Supports parameter: ?sheetName=Master or defaults to FMS.
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
    
    if (action === "listSheets") {
      var sheets = ss.getSheets();
      var sheetsInfo = [];
      for (var i = 0; i < sheets.length; i++) {
        var s = sheets[i];
        var sName = s.getName();
        var lastRow = s.getLastRow();
        var lastCol = s.getLastColumn();
        
        var firstRow = [];
        if (lastRow >= 1 && lastCol > 0) {
          firstRow = s.getRange(1, 1, 1, lastCol).getValues()[0];
        }
        var sixthRow = [];
        if (lastRow >= 6 && lastCol > 0) {
          sixthRow = s.getRange(6, 1, 1, lastCol).getValues()[0];
        }
        
        sheetsInfo.push({
          name: sName,
          rowCount: lastRow,
          columnCount: lastCol,
          headersRow1: firstRow,
          headersRow6: sixthRow
        });
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        sheets: sheetsInfo
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheetName = (e && e.parameter && e.parameter.sheetName) ? e.parameter.sheetName : "FMS";
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Sheet '" + sheetName + "' nahi mili." 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();
    
    // FMS headers are on Row 6, data starts at Row 7.
    // Master or other sheets are assumed to have headers on Row 1, data starts at Row 2.
    var headerRowIndex = (sheetName === "FMS") ? 6 : 1;
    var dataRowIndex = (sheetName === "FMS") ? 7 : 2;
    
    if (lastRow < dataRowIndex) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        data: [] 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = sheet.getRange(headerRowIndex, 1, 1, lastColumn).getValues()[0];
    var dataValues = sheet.getRange(dataRowIndex, 1, lastRow - headerRowIndex, lastColumn).getValues();
    
    var jsonArray = [];
    for (var i = 0; i < dataValues.length; i++) {
      var row = dataValues[i];
      
      // Skip empty rows
      if (sheetName === "FMS") {
        if (!row[1] || row[1].toString().trim() === "") {
          continue; // Skip if Order No (Col B) is empty
        }
      } else {
        if (!row[0] || row[0].toString().trim() === "") {
          continue; // Skip if Col A is empty
        }
      }
      
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        var headerName = headers[j];
        if (headerName) {
          obj[headerName] = row[j];
        }
      }
      jsonArray.push(obj);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: jsonArray
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper to upload a base64 file to Google Drive and return a public shareable link.
 */
function uploadToGoogleDrive(base64Data, fileName, mimeType) {
  try {
    if (!base64Data) return "";
    
    // Decode base64
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    // Use target folder ID provided by the user
    var folderId = "13AziMw4LHBheacx00BaUWEyGRdMKnZVd";
    var folder = DriveApp.getFolderById(folderId);
    
    // Save file
    var file = folder.createFile(blob);
    
    // Set view access for anyone with the link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Return view URL
    return file.getUrl();
  } catch (e) {
    Logger.log("Drive upload error: " + e.toString());
    return "";
  }
}
