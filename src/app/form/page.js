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

  // 🔴 นำ URL ของ Web App วางตรงนี้ 🔴
  const API_URL = "YOUR_WEB_APP_URL_HERE";

  // โหลดประเภทกิจการ
  useEffect(() => {
    fetch(`${API_URL}?action=getBusinessTypes`)
      .then(res => res.json())
      .then(data => setBizTypes(data))
      .catch(console.error);
  }, []);

  // โหลดแผนที่ (เฉพาะในสเต็ป 1)
  useEffect(() => {
    if (step === 1 && typeof window !== "undefined" && window.L && !mapRef.current) {
      setTimeout(() => {
        const map = window.L.map('map').setView([14.912, 103.363], 14);
        window.L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }).addTo(map);
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

  // ฟังก์ชันจัดกการผู้ลงนามนิติบุคคล
  const handleSigChange = (index, field, value) => {
    const newSig = [...signatories];
    newSig[index][field] = value;
    setSignatories(newSig);
  };

  const goToSummary = () => {
    const form = document.getElementById('licenseForm');
    if (!form.reportValidity()) return; // เช็คว่ากรอกครบไหม

    const formData = new FormData(form);
    
    // รวมชื่อผู้ลงนามนิติบุคคล
    let sigText = "-";
    if (isJuristic) {
      const validSigs = signatories.filter(s => s.name.trim() !== "");
      if (validSigs.length > 0) sigText = validSigs.map((s, i) => `${i + 1}. ${s.name}`).join(', ');
    }
    
    // จัดเก็บข้อมูลเพื่อโชว์ในหน้าสรุป
    setSummary({
      applicantName: formData.get("applicantName"),
      applicantType: formData.get("applicantType"),
      phone: formData.get("phone"),
      businessName: formData.get("businessName"),
      businessType: formData.get("businessType"),
      address: `เลขที่ ${formData.get("bizAddressNo")} ต.${formData.get("bizAddressSubdistrict")} อ.${formData.get("bizAddressDistrict")} จ.${formData.get("bizAddressProvince")}`,
      lat: formData.get("latitude"),
      lng: formData.get("longitude"),
      authSignatories: sigText
    });

    setStep(2);
    window.scrollTo(0, 0);
  };

  // อ่านไฟล์ภาพเป็น Base64
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

  const submitData = async () => {
    setIsLoading(true);
    setStatusMsg({ type: "info", text: "กำลังอัปโหลดเอกสารและบันทึกข้อมูล (โปรดอย่าเพิ่งปิดหน้าจอ)..." });

    try {
      const form = document.getElementById('licenseForm');
      const formData = new FormData(form);
      const formObject = Object.fromEntries(formData.entries());
      
      formObject.authSignatories = summary.authSignatories; // ใส่ชื่อผู้ลงนาม
      
      // ดึงไฟล์
      formObject.fileDoc1 = await getFileData('uploadDoc1');
      formObject.fileDoc2 = await getFileData('uploadDoc2');
      formObject.fileDoc3 = await getFileData('uploadDoc3');
      formObject.fileDoc4 = await getFileData('uploadDoc4');
      formObject.fileDoc5 = await getFileData('uploadDoc5');
      formObject.fileDoc6 = await getFileData('uploadDoc6');
      formObject.fileDoc7 = await getFileData('uploadDoc7');

      // ยิง API (POST) ไปยัง Google Apps Script
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "processForm", formObject: formObject })
      });
      const result = await res.json();

      if (result.status === "success") {
        setStatusMsg({ type: "success", text: result.message });
        form.reset();
        setSignatories([{ name: "", address: "" }]);
        setTimeout(() => { setStep(1); setStatusMsg(null); }, 3000);
      } else {
        setStatusMsg({ type: "danger", text: "เกิดข้อผิดพลาด: " + result.message });
      }
    } catch (err) {
      setStatusMsg({ type: "danger", text: "เกิดข้อผิดพลาดในการส่งข้อมูล: " + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-container">
      <Link href="/admin" className="btn btn-light mb-3"><i className="bi bi-arrow-left"></i> กลับหน้าระบบจัดการ</Link>
      <div className="card">
        <div className="card-header-form text-center">
          <i className="bi bi-file-earmark-text mb-2 d-block" style={{ fontSize: "2.5rem" }}></i>
          <h4 className="mb-1 fw-bold">บันทึกคำขอรับใบอนุญาต อภ.1</h4>
          <p className="mb-0 text-white-50">แบบฟอร์มบันทึกข้อมูลกิจการที่เป็นอันตรายต่อสุขภาพ (สำหรับเจ้าหน้าที่)</p>
        </div>
        
        <div className="card-body p-4 p-md-5">
          <form id="licenseForm">
            
            {/* ====== สเต็ปที่ 1: กรอกข้อมูล ====== */}
            <div className={step === 1 ? "d-block" : "d-none"}>
              <h5 className="section-title"><i className="bi bi-person-vcard"></i> 1. ข้อมูลผู้ขออนุญาต</h5>
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">ประเภทผู้ขอ</label>
                  <select className="form-select" name="applicantType" onChange={(e) => setIsJuristic(e.target.value === 'นิติบุคคล')} required>
                    <option value="บุคคลธรรมดา">บุคคลธรรมดา</option>
                    <option value="นิติบุคคล">นิติบุคคล</option>
                  </select>
                </div>
                <div className="col-md-5">
                  <label className="form-label">ชื่อ-นามสกุล / ชื่อนิติบุคคล</label>
                  <input type="text" className="form-control" name="applicantName" placeholder="ระบุชื่อเต็ม" required />
                </div>
                <div className="col-md-2">
                  <label className="form-label">อายุ (ปี)</label>
                  <input type="number" className="form-control" name="age" />
                </div>
                <div className="col-md-2">
                  <label className="form-label">สัญชาติ</label>
                  <input type="text" className="form-control" name="nationality" defaultValue="ไทย" />
                </div>
              </div>

              {isJuristic && (
                <div className="juristic-box">
                  <h6 className="fw-bold text-primary mb-3"><i className="bi bi-people-fill me-2"></i>รายชื่อผู้มีอำนาจลงชื่อแทนนิติบุคคล</h6>
                  {signatories.map((sig, i) => (
                    <div className="row g-2 mb-2" key={i}>
                      <div className="col-md-5"><input type="text" className="form-control" placeholder="ชื่อ-นามสกุล" value={sig.name} onChange={e => handleSigChange(i, 'name', e.target.value)} /></div>
                      <div className="col-md-6"><input type="text" className="form-control" placeholder="ที่อยู่" value={sig.address} onChange={e => handleSigChange(i, 'address', e.target.value)} /></div>
                      {i > 0 && <div className="col-md-1"><button type="button" className="btn btn-danger w-100 rounded-3" onClick={() => handleRemoveSignatory(i)}><i className="bi bi-trash"></i></button></div>}
                    </div>
                  ))}
                  <button type="button" className="btn btn-outline-primary btn-sm mt-2 rounded-pill fw-bold" onClick={() => setSignatories([...signatories, { name: "", address: "" }])}><i className="bi bi-plus-lg me-1"></i> เพิ่มผู้ลงนาม</button>
                </div>
              )}

              <h6 className="mt-4 fw-bold text-secondary"><i className="bi bi-house-door me-2"></i>ที่อยู่ผู้ขออนุญาต</h6>
              <div className="row g-3">
                <div className="col-md-2"><label className="form-label">เลขที่</label><input type="text" className="form-control" name="addressNo" required /></div>
                <div className="col-md-2"><label className="form-label">หมู่ที่</label><input type="text" className="form-control" name="addressMoo" /></div>
                <div className="col-md-4"><label className="form-label">หมู่บ้าน/อาคาร</label><input type="text" className="form-control" name="addressVillage" /></div>
                <div className="col-md-4"><label className="form-label">ตรอก/ซอย</label><input type="text" className="form-control" name="addressSoi" /></div>
                <div className="col-md-3"><label className="form-label">ถนน</label><input type="text" className="form-control" name="addressRoad" /></div>
                <div className="col-md-3"><label className="form-label">แขวง/ตำบล</label><input type="text" className="form-control" name="addressSubdistrict" required /></div>
                <div className="col-md-3"><label className="form-label">เขต/อำเภอ</label><input type="text" className="form-control" name="addressDistrict" required /></div>
                <div className="col-md-3"><label className="form-label">จังหวัด</label><input type="text" className="form-control" name="addressProvince" required /></div>
                <div className="col-md-6"><label className="form-label text-primary">เบอร์โทรศัพท์ติดต่อ</label><input type="tel" className="form-control border-primary bg-white" name="phone" placeholder="08X-XXX-XXXX" required /></div>
              </div>

              <h5 className="section-title"><i className="bi bi-shop"></i> 2. ข้อมูลการประกอบกิจการ</h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">ประเภทกิจการ</label>
                  <select className="form-select" name="businessType" required>
                    <option value="">-- โปรดเลือกประเภทกิจการ --</option>
                    {bizTypes.map((t, i) => {
                      const saveValue = t.name + (t.size && t.size !== "-" ? ` (${t.size})` : "");
                      const displayStr = saveValue + (t.fee !== "0" ? ` - ค่าธรรมเนียม ${t.fee} บาท` : "");
                      return <option key={i} value={saveValue}>{displayStr}</option>;
                    })}
                  </select>
                </div>
                <div className="col-md-6"><label className="form-label">ชื่อสถานประกอบการ</label><input type="text" className="form-control" name="businessName" placeholder="ชื่อป้ายร้าน" required /></div>
                <div className="col-md-4"><label className="form-label">พื้นที่ (ตร.ม.)</label><input type="number" className="form-control" name="area" required /></div>
              </div>

              <h6 className="mt-4 fw-bold text-secondary"><i className="bi bi-geo-alt me-2"></i>ที่ตั้งสถานประกอบการ</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-2"><label className="form-label">เลขที่</label><input type="text" className="form-control" name="bizAddressNo" required /></div>
                <div className="col-md-2"><label className="form-label">หมู่ที่</label><input type="text" className="form-control" name="bizAddressMoo" /></div>
                <div className="col-md-4"><label className="form-label">ตรอก/ซอย</label><input type="text" className="form-control" name="bizAddressSoi" /></div>
                <div className="col-md-4"><label className="form-label">ถนน</label><input type="text" className="form-control" name="bizAddressRoad" /></div>
                <div className="col-md-4"><label className="form-label">ตำบล</label><input type="text" className="form-control" name="bizAddressSubdistrict" defaultValue="หนองเต็ง" required /></div>
                <div className="col-md-4"><label className="form-label">อำเภอ</label><input type="text" className="form-control" name="bizAddressDistrict" defaultValue="กระสัง" required /></div>
                <div className="col-md-4"><label className="form-label">จังหวัด</label><input type="text" className="form-control" name="bizAddressProvince" defaultValue="บุรีรัมย์" required /></div>
                <div className="col-md-6"><label className="form-label">โทรศัพท์ (กิจการ)</label><input type="tel" className="form-control" name="bizPhone" /></div>
              </div>

              <div className="p-3 bg-white border rounded-4 mb-4">
                <p className="text-primary mb-2 fw-bold"><i className="bi bi-pin-map-fill me-2"></i>ปักหมุดแผนที่ (คลิกหรือลากหมุด)</p>
                <div id="map"></div>
                <div className="row mt-3">
                  <div className="col-md-6"><label className="form-label text-muted small">ละติจูด (Latitude)</label><input type="text" className="form-control form-control-sm text-center fw-bold text-primary" name="latitude" id="lat" readOnly /></div>
                  <div className="col-md-6"><label className="form-label text-muted small">ลองจิจูด (Longitude)</label><input type="text" className="form-control form-control-sm text-center fw-bold text-primary" name="longitude" id="lng" readOnly /></div>
                </div>
              </div>

              <h5 className="section-title"><i className="bi bi-file-earmark-arrow-up"></i> 3. อัปโหลดเอกสารแนบ</h5>
              <div className="upload-box mb-4">
                <div className="upload-item"><label className="form-label">1. สำเนาบัตรประจำตัวประชาชน</label><input className="form-control form-control-sm" type="file" id="uploadDoc1" accept=".pdf, image/*" /></div>
                <div className="upload-item"><label className="form-label">2. สำเนาทะเบียนบ้าน</label><input className="form-control form-control-sm" type="file" id="uploadDoc2" accept=".pdf, image/*" /></div>
                <div className="upload-item"><label className="form-label">3. ใบอนุญาตควบคุมอาคาร / เอกสารเกี่ยวข้อง</label><input className="form-control form-control-sm" type="file" id="uploadDoc3" accept=".pdf, image/*" /></div>
                <div className="upload-item"><label className="form-label">4. ใบมอบอำนาจ (ถ้ามี)</label><input className="form-control form-control-sm" type="file" id="uploadDoc4" accept=".pdf, image/*" /></div>
                <div className="upload-item"><label className="form-label">5. หนังสือรับรองการจดทะเบียนนิติบุคคล</label><input className="form-control form-control-sm" type="file" id="uploadDoc5" accept=".pdf, image/*" /></div>
                <div className="upload-item"><label className="form-label">6. หลักฐานผู้มีอำนาจลงนาม</label><input className="form-control form-control-sm" type="file" id="uploadDoc6" accept=".pdf, image/*" /></div>
                <div className="upload-item"><label className="form-label">7. หลักฐานอื่นๆ (ถ้ามี)</label><input className="form-control form-control-sm" type="file" id="uploadDoc7" accept=".pdf, image/*" /></div>
              </div>

              <div className="text-end mt-5 pt-3 border-top">
                <button type="button" className="btn btn-primary btn-lg" onClick={goToSummary}>ถัดไป: ตรวจสอบข้อมูล <i className="bi bi-arrow-right ms-2"></i></button>
              </div>
            </div>

            {/* ====== สเต็ปที่ 2: สรุปและยืนยัน ====== */}
            <div className={step === 2 ? "d-block" : "d-none"}>
              <h5 className="section-title text-success"><i className="bi bi-check2-circle"></i> ตรวจสอบความถูกต้องก่อนส่งข้อมูล</h5>
              <div className="summary-box">
                <div className="row">
                  <div className="col-md-6"><span className="summary-label"><i className="bi bi-person me-1"></i> ชื่อผู้ขออนุญาต</span><div className="summary-value">{summary.applicantName} <span className="badge bg-primary bg-opacity-10 text-primary ms-2">{summary.applicantType}</span></div></div>
                  <div className="col-md-6"><span className="summary-label"><i className="bi bi-telephone me-1"></i> เบอร์ติดต่อ</span><div className="summary-value">{summary.phone}</div></div>
                  <div className="col-12 mt-3 mb-3"><hr className="text-muted" /></div>
                  <div className="col-md-6"><span className="summary-label"><i className="bi bi-shop me-1"></i> ชื่อสถานประกอบการ</span><div className="summary-value text-primary fw-bold">{summary.businessName}</div></div>
                  <div className="col-md-6"><span className="summary-label"><i className="bi bi-tag me-1"></i> ประเภทกิจการ</span><div className="summary-value">{summary.businessType}</div></div>
                  <div className="col-12 mt-2"><span className="summary-label"><i className="bi bi-geo-alt me-1"></i> ที่ตั้ง</span><div className="summary-value">{summary.address}</div></div>
                  <div className="col-12 mt-2"><span className="summary-label"><i className="bi bi-crosshair me-1"></i> พิกัดแผนที่</span><div className="summary-value text-muted"><small>LAT: {summary.lat}, LNG: {summary.lng}</small></div></div>
                </div>
              </div>

              {statusMsg && (
                <div className={`alert alert-${statusMsg.type} mt-4 rounded-4`} role="alert">
                  {statusMsg.type === "info" && <i className="bi bi-cloud-arrow-up-fill me-2"></i>}
                  {statusMsg.type === "success" && <i className="bi bi-check-circle-fill me-2"></i>}
                  {statusMsg.type === "danger" && <i className="bi bi-x-circle-fill me-2"></i>}
                  {statusMsg.text}
                </div>
              )}

              <div className="d-flex justify-content-between mt-5 pt-3 border-top">
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} disabled={isLoading}><i className="bi bi-arrow-left me-2"></i> แก้ไขข้อมูล</button>
                <button type="button" className="btn btn-success" onClick={submitData} disabled={isLoading}>
                  {isLoading ? <><span className="spinner-border spinner-border-sm me-2"></span> กำลังส่ง...</> : <><i className="bi bi-send-fill me-2"></i> ยืนยันและบันทึกข้อมูล</>}
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}