"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function FormPage() {
  const [step, setStep] = useState(1);
  const [bizTypes, setBizTypes] = useState([]);
  const [isJuristic, setIsJuristic] = useState(false);
  const [signatories, setSignatories] = useState([{ name: "", address: "" }]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [summary, setSummary] = useState({});
  const mapRef = useRef(null);

  // 🔴 นำ URL ของ Web App (Google Apps Script) วางตรงนี้ 🔴
  const API_URL = "YOUR_WEB_APP_URL_HERE";

  // โหลดประเภทกิจการจาก Google Sheets มารอไว้ที่ Dropdown
  useEffect(() => {
    if (API_URL === "https://script.google.com/macros/s/AKfycbzQO_vdqxqgZBg3ok8KmZ3ETLbFeTY2VAhnEjJH5eee5evZ8lYXY8fVmqenFJPwQ74E/exec" || !API_URL) return;

    fetch(`${API_URL}?action=getBusinessTypes`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBizTypes(data);
        } else {
          console.error("รูปแบบข้อมูลประเภทกิจการไม่ถูกต้อง:", data);
        }
      })
      .catch(err => console.error("เกิดข้อผิดพลาดในการดึงประเภทกิจการ:", err));
  }, []);

  // โหลดระบบแผนที่ลากหมุด Leaflet (ทำงานเฉพาะใน Step 1)
  useEffect(() => {
    if (step === 1 && typeof window !== "undefined" && window.L && !mapRef.current) {
      setTimeout(() => {
        const map = window.L.map('map').setView([14.912, 103.363], 14);
        window.L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { 
          maxZoom: 20, 
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] 
        }).addTo(map);
        
        const marker = window.L.marker([14.912, 103.363], { draggable: true }).addTo(map);

        map.on('click', (e) => {
          marker.setLatLng(e.latlng);
          document.getElementById("lat").value = e.latlng.lat.toFixed(6);
          document.getElementById("lng").value = e.latlng.lng.toFixed(6);
        });
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          document.getElementById("lat").value = pos.lat.toFixed(6);
          document.getElementById("lng").value = pos.lng.toFixed(6);
        });
        mapRef.current = map;
      }, 500);
    }
  }, [step]);

  // จัดการรายชื่อผู้ลงนามกรณีนิติบุคคล
  const handleSigChange = (index, field, value) => {
    const newSig = [...signatories];
    newSig[index][field] = value;
    setSignatories(newSig);
  };

  const handleRemoveSignatory = (index) => {
    const newSig = [...signatories];
    newSig.splice(index, 1);
    setSignatories(newSig);
  };

  // ตรวจสอบข้อมูลก่อนข้ามไปหน้าสรุป (Step 2)
  const goToSummary = () => {
    const form = document.getElementById('licenseForm');
    if (!form.reportValidity()) return; 

    const formData = new FormData(form);
    
    let sigText = "-";
    if (isJuristic) {
      const validSigs = signatories.filter(s => s.name.trim() !== "");
      if (validSigs.length > 0) sigText = validSigs.map((s, i) => `${i + 1}. ${s.name}`).join(', ');
    }
    
    setSummary({
      applicantName: formData.get("applicantName"),
      applicantType: formData.get("applicantType"),
      phone: formData.get("phone"),
      businessName: formData.get("businessName"),
      businessType: formData.get("businessType"),
      address: `เลขที่ ${formData.get("bizAddressNo")} ต.${formData.get("bizAddressSubdistrict")} อ.${formData.get("bizAddressDistrict")} จ.${formData.get("bizAddressProvince")}`,
      lat: formData.get("latitude") || "-",
      lng: formData.get("longitude") || "-",
      authSignatories: sigText
    });

    setStep(2);
    window.scrollTo(0, 0);
  };

  // ดึงไฟล์และแปลงเป็น Base64 ส่งไปเก็บที่ Google Drive ของหน่วยงาน
  const getFileData = (inputId) => {
    return new Promise((resolve) => {
      const fileInput = document.getElementById(inputId);
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) return resolve("");
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, mimeType: file.type, data: reader.result.split(',')[1] });
      reader.readAsDataURL(file);
    });
  };

  // ยิงคำสั่งบันทึกข้อมูลเข้า Google Sheets และส่งรูปเข้า Drive
  const submitData = async () => {
    setIsLoading(true);
    setStatusMsg({ type: "info", text: "กำลังอัปโหลดเอกสารแนบและบันทึกข้อมูล (โปรดอย่าเพิ่งปิดหน้าต่างนี้)..." });

    try {
      const form = document.getElementById('licenseForm');
      const formData = new FormData(form);
      const formObject = Object.fromEntries(formData.entries());
      
      formObject.authSignatories = summary.authSignatories; 
      
      // ลูปดึงค่าเอกสารแนบ 7 ชุด
      formObject.fileDoc1 = await getFileData('uploadDoc1');
      formObject.fileDoc2 = await getFileData('uploadDoc2');
      formObject.fileDoc3 = await getFileData('uploadDoc3');
      formObject.fileDoc4 = await getFileData('uploadDoc4');
      formObject.fileDoc5 = await getFileData('uploadDoc5');
      formObject.fileDoc6 = await getFileData('uploadDoc6');
      formObject.fileDoc7 = await getFileData('uploadDoc7');

      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "processForm", formObject: formObject })
      });
      const result = await res.json();

      if (result.status === "success") {
        setStatusMsg({ type: "success", text: "🎉 บันทึกคำขอสำเร็จเรียบร้อย! ระบบจะส่งข้อมูลให้เจ้าหน้าที่ดำเนินการต่อไป" });
        form.reset();
        setSignatories([{ name: "", address: "" }]);
        setTimeout(() => { setStep(1); setStatusMsg(null); }, 3000);
      } else {
        setStatusMsg({ type: "danger", text: "เกิดข้อผิดพลาดจากระบบหลังบ้าน: " + result.message });
      }
    } catch (err) {
      setStatusMsg({ type: "danger", text: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: " + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-container">
      <Link href="/admin" className="btn btn-light mb-3"><i className="bi bi-arrow-left"></i> กลับหน้าระบบจัดการ</Link>
      
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header-form text-center">
          <i className="bi bi-file-earmark-text mb-2 d-block" style={{ fontSize: "2.5rem" }}></i>
          <h4 className="mb-1 fw-bold">บันทึกคำขอรับใบอนุญาต อภ.1</h4>
          <p className="mb-0 text-white-50">แบบฟอร์มยื่นข้อมูลกิจการที่เป็นอันตรายต่อสุขภาพ เทศบาลตำบลหนองเต็ง</p>
        </div>
        
        <div className="card-body p-4 p-md-5 bg-white">
          <form id="licenseForm">
            
            {/* ====== สเต็ปที่ 1: กรอกข้อมูลฟอร์มต้นฉบับ ====== */}
            <div className={step === 1 ? "d-block" : "d-none"}>
              
              <h5 className="section-title"><i className="bi bi-person-vcard"></i> 1. ข้อมูลผู้ขออนุญาต</h5>
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label small fw-bold">ประเภทผู้ขอ</label>
                  <select className="form-select" name="applicantType" onChange={(e) => setIsJuristic(e.target.value === 'นิติบุคคล')} required>
                    <option value="บุคคลธรรมดา">บุคคลธรรมดา</option>
                    <option value="นิติบุคคล">นิติบุคคล</option>
                  </select>
                </div>
                <div className="col-md-5">
                  <label className="form-label small fw-bold">ชื่อ-นามสกุล / ชื่อนิติบุคคล</label>
                  <input type="text" className="form-control" name="applicantName" placeholder="ระบุชื่อเต็ม" required />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">อายุ (ปี)</label>
                  <input type="number" className="form-control" name="age" />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">สัญชาติ</label>
                  <input type="text" className="form-control" name="nationality" defaultValue="ไทย" />
                </div>
              </div>

              {isJuristic && (
                <div className="juristic-box">
                  <h6 className="fw-bold text-primary mb-3"><i className="bi bi-people-fill me-2"></i>รายชื่อผู้มีอำนาจลงชื่อแทนนิติบุคคล</h6>
                  {signatories.map((sig, i) => (
                    <div className="row g-2 mb-2" key={i}>
                      <div className="col-md-5"><input type="text" className="form-control form-control-sm" placeholder="ชื่อ-นามสกุล" value={sig.name} onChange={e => handleSigChange(i, 'name', e.target.value)} /></div>
                      <div className="col-md-6"><input type="text" className="form-control form-control-sm" placeholder="ที่อยู่" value={sig.address} onChange={e => handleSigChange(i, 'address', e.target.value)} /></div>
                      {i > 0 && <div className="col-md-1"><button type="button" className="btn btn-danger btn-sm w-100 rounded-3" onClick={() => handleRemoveSignatory(i)}><i className="bi bi-trash"></i></button></div>}
                    </div>
                  ))}
                  <button type="button" className="btn btn-outline-primary btn-sm mt-2 rounded-pill fw-bold" onClick={() => setSignatories([...signatories, { name: "", address: "" }])}><i className="bi bi-plus-lg me-1"></i> เพิ่มผู้ลงนาม</button>
                </div>
              )}

              <h6 className="mt-4 fw-bold text-secondary"><i className="bi bi-house-door me-2"></i>ที่อยู่ผู้ขออนุญาต</h6>
              <div className="row g-3">
                <div className="col-md-2"><label className="form-label small">เลขที่</label><input type="text" className="form-control" name="addressNo" required /></div>
                <div className="col-md-2"><label className="form-label small">หมู่ที่</label><input type="text" className="form-control" name="addressMoo" /></div>
                <div className="col-md-4"><label className="form-label small">หมู่บ้าน/อาคาร</label><input type="text" className="form-control" name="addressVillage" /></div>
                <div className="col-md-4"><label className="form-label small">ตรอก/ซอย</label><input type="text" className="form-control" name="addressSoi" /></div>
                <div className="col-md-3"><label className="form-label small">ถนน</label><input type="text" className="form-control" name="addressRoad" /></div>
                <div className="col-md-3"><label className="form-label small">แขวง/ตำบล</label><input type="text" className="form-control" name="addressSubdistrict" required /></div>
                <div className="col-md-3"><label className="form-label small">เขต/อำเภอ</label><input type="text" className="form-control" name="addressDistrict" required /></div>
                <div className="col-md-3"><label className="form-label small">จังหวัด</label><input type="text" className="form-control" name="addressProvince" required /></div>
                <div className="col-md-6"><label className="form-label small fw-bold text-primary">เบอร์โทรศัพท์ติดต่อ</label><input type="tel" className="form-control border-primary" name="phone" placeholder="08X-XXX-XXXX" required /></div>
              </div>

              <h5 className="section-title"><i className="bi bi-shop"></i> 2. ข้อมูลการประกอบกิจการ</h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-bold">ประเภทกิจการที่เป็นอันตรายต่อสุขภาพ</label>
                  <select className="form-select border-primary" name="businessType" required>
                    <option value="">-- โปรดเลือกประเภทกิจการ --</option>
                    {bizTypes.map((t, i) => {
                      const saveValue = t.name + (t.size && t.size !== "-" ? ` (${t.size})` : "");
                      const displayStr = saveValue + (t.fee !== "0" ? ` - ค่าธรรมเนียม ${t.fee} บาท` : "");
                      return <option key={i} value={saveValue}>{displayStr}</option>;
                    })}
                  </select>
                </div>
                <div className="col-md-6"><label className="form-label small fw-bold">ชื่อสถานประกอบการ (ชื่อร้าน/ป้าย)</label><input type="text" className="form-control" name="businessName" placeholder="ระบุชื่อกิจการ" required /></div>
                <div className="col-md-4"><label className="form-label small">พื้นที่ประกอบกิจการ (ตร.ม.)</label><input type="number" className="form-control" name="area" required /></div>
              </div>

              <h6 className="mt-4 fw-bold text-secondary"><i className="bi bi-geo-alt me-2"></i>ที่ตั้งสถานประกอบการ</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-2"><label className="form-label small">เลขที่</label><input type="text" className="form-control" name="bizAddressNo" required /></div>
                <div className="col-md-2"><label className="form-label small">หมู่ที่</label><input type="text" className="form-control" name="bizAddressMoo" /></div>
                <div className="col-md-4"><label className="form-label small">ตรอก/ซอย</label><input type="text" className="form-control" name="bizAddressSoi" /></div>
                <div className="col-md-4"><label className="form-label small">ถนน</label><input type="text" className="form-control" name="bizAddressRoad" /></div>
                <div className="col-md-4"><label className="form-label small">ตำบล</label><input type="text" className="form-control" name="bizAddressSubdistrict" defaultValue="หนองเต็ง" required /></div>
                <div className="col-md-4"><label className="form-label small">อำเภอ</label><input type="text" className="form-control" name="bizAddressDistrict" defaultValue="กระสัง" required /></div>
                <div className="col-md-4"><label className="form-label small">จังหวัด</label><input type="text" className="form-control" name="bizAddressProvince" defaultValue="บุรีรัมย์" required /></div>
                <div className="col-md-6"><label className="form-label small">โทรศัพท์สถานประกอบการ</label><input type="tel" className="form-control" name="bizPhone" /></div>
              </div>

              {/* ส่วนแผนที่สำหรับปักหมุดที่ตั้งร้าน */}
              <div className="p-3 bg-light border rounded-4 mb-4">
                <p className="text-primary mb-2 fw-bold"><i className="bi bi-pin-map-fill me-2"></i>ระบุพิกัดร้านค้าบนแผนที่ (คลิกหรือลากหมุด)</p>
                <div id="map"></div>
                <div className="row mt-3">
                  <div className="col-md-6"><label className="form-label text-muted small">ละติจูด (Latitude)</label><input type="text" className="form-control form-control-sm text-center fw-bold bg-white" name="latitude" id="lat" readOnly /></div>
                  <div className="col-md-6"><label className="form-label text-muted small">ลองจิจูด (Longitude)</label><input type="text" className="form-control form-control-sm text-center fw-bold bg-white" name="longitude" id="lng" readOnly /></div>
                </div>
              </div>

              <h5 className="section-title"><i className="bi bi-file-earmark-arrow-up"></i> 3. เอกสารหลักฐานแนบ</h5>
              <div className="upload-box mb-4">
                <div className="upload-item"><label className="form-label small">1. สำเนาบัตรประจำตัวประชาชน</label><input className="form-control form-control-sm" type="file" id="uploadDoc1" accept=".pdf, image/*" /></div>
                <div className="upload-item"><label className="form-label small">2. สำเนาทะเบียนบ้าน</label><input className="form-control form-control-sm" type="file" id="uploadDoc2" accept=".pdf, image/*" /></div>
                <div className="upload-item"><label className="form-label small">3. ใบอนุญาตควบคุมอาคาร / เอกสารยินยอมใช้อาคาร</label><input className="form-control form-control-sm" type="file" id="uploadDoc3" accept=".pdf, image/*" /></div>
                <div className="upload-item"><label className="form-label small">4. ใบมอบอำนาจ (กรณีให้ผู้อื่นดำเนินการแทน)</label><input className="form-control form-control-sm" type="file" id="uploadDoc4" accept=".pdf, image/*" /></div>
                <div className="upload-item"><label className="form-label small">5. หนังสือรับรองการจดทะเบียนนิติบุคคล (กรณีนิติบุคคล)</label><input className="form-control form-control-sm" type="file" id="uploadDoc5" accept=".pdf, image/*" /></div>
                <div className="upload-item"><label className="form-label small">6. หลักฐานแสดงผู้มีอำนาจลงนามแทนนิติบุคคล</label><input className="form-control form-control-sm" type="file" id="uploadDoc6" accept=".pdf, image/*" /></div>
                <div className="upload-item"><label className="form-label small">7. หลักฐานความปลอดภัย/เอกสารอื่นๆ (ถ้ามี)</label><input className="form-control form-control-sm" type="file" id="uploadDoc7" accept=".pdf, image/*" /></div>
              </div>

              <div className="text-end mt-5 pt-3 border-top">
                <button type="button" className="btn btn-primary btn-lg rounded-pill px-5 fw-bold" onClick={goToSummary}>ถัดไป: ตรวจสอบข้อมูลก่อนส่ง <i className="bi bi-arrow-right ms-1"></i></button>
              </div>
            </div>

            {/* ====== สเต็ปที่ 2: สรุปและยืนยันข้อมูล ====== */}
            <div className={step === 2 ? "d-block" : "d-none"}>
              <h5 className="section-title text-success"><i className="bi bi-check2-circle"></i> ตรวจสอบความถูกต้องของข้อมูลใบสมัคร</h5>
              
              <div className="summary-box shadow-sm border mb-4">
                <div className="row">
                  <div className="col-md-6">
                    <span className="summary-label"><i className="bi bi-person me-1"></i> ชื่อผู้ขออนุญาต</span>
                    <div className="summary-value">{summary.applicantName} <span className="badge bg-primary bg-opacity-10 text-primary ms-2">{summary.applicantType}</span></div>
                  </div>
                  <div className="col-md-6">
                    <span className="summary-label"><i className="bi bi-telephone me-1"></i> เบอร์ติดต่อหลัก</span>
                    <div className="summary-value">{summary.phone}</div>
                  </div>
                  
                  <div className="col-12 my-2"><hr className="text-muted opacity-25" /></div>
                  
                  <div className="col-md-6">
                    <span className="summary-label"><i className="bi bi-shop me-1"></i> ชื่อสถานประกอบการ</span>
                    <div className="summary-value text-primary fw-bold">{summary.businessName}</div>
                  </div>
                  <div className="col-md-6">
                    <span className="summary-label"><i className="bi bi-tag me-1"></i> ประเภทกลุ่มกิจการ</span>
                    <div className="summary-value">{summary.businessType}</div>
                  </div>
                  
                  <div className="col-12 mt-3">
                    <span className="summary-label"><i className="bi bi-geo-alt me-1"></i> ที่ตั้งประกอบการ</span>
                    <div className="summary-value">{summary.address}</div>
                  </div>
                  <div className="col-12 mt-2">
                    <span className="summary-label"><i className="bi bi-crosshair me-1"></i> พิกัดละติจูด/ลองจิจูด</span>
                    <div className="summary-value text-muted small">LAT: {summary.lat} , LNG: {summary.lng}</div>
                  </div>
                </div>
              </div>

              {/* ข้อความแจ้งเตือนสถานะการรันงาน */}
              {statusMsg && (
                <div className={`alert alert-${statusMsg.type} mt-4 rounded-4 shadow-sm`} role="alert">
                  {statusMsg.type === "info" && <div className="spinner-border spinner-border-sm me-2"></div>}
                  {statusMsg.type === "success" && <i className="bi bi-check-circle-fill me-2"></i>}
                  {statusMsg.type === "danger" && <i className="bi bi-x-circle-fill me-2"></i>}
                  {statusMsg.text}
                </div>
              )}

              <div className="d-flex justify-content-between mt-5 pt-3 border-top">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setStep(1)} disabled={isLoading}>
                  <i className="bi bi-arrow-left me-1"></i> ย้อนกลับไปแก้ไข
                </button>
                <button type="button" className="btn btn-success btn-lg rounded-pill px-5 fw-bold" onClick={submitData} disabled={isLoading}>
                  {isLoading ? "ระบบกำลังบันทึกข้อมูล..." : <><i className="bi bi-send-fill me-2"></i> ยืนยันและส่งคำขอ</>}
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
      
      <div className="text-center mt-4 text-muted small">
        กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลหนองเต็ง อำเภกระสัง จังหวัดบุรีรัมย์
      </div>
    </div>
  );
}