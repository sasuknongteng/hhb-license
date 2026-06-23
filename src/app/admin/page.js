"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [stats, setStats] = useState({ total: '-', pending: '-', approved: '-', expiringSoon: '-', expired: '-' });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);

  // === State สำหรับ Modal จัดการคำขอ ===
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [reqData, setReqData] = useState(null); // เก็บข้อมูลที่ดึงมาจาก Sheet
  
  // State ฟอร์มแต่ละสเต็ป
  const [formData, setFormData] = useState({
    editRowNumber: '', editLicenseNo: '', editApproveDate: '', editDocStatus: 'ครบ', editOfficerName: '',
    receiptBook: '', receiptNo: '', receiptDate: '', inspectConditions: ''
  });

  // 🔴 นำ URL ของ Web App วางตรงนี้ 🔴
  const API_URL = "https://script.google.com/macros/s/AKfycbzQO_vdqxqgZBg3ok8KmZ3ETLbFeTY2VAhnEjJH5eee5evZ8lYXY8fVmqenFJPwQ74E/exec";

  useEffect(() => {
    if (sessionStorage.getItem("isAdminLoggedIn") === "true") {
      setIsLoggedIn(true);
      loadAllData();
    }
  }, []);

  const handleLogin = async (e) => { /*... (ใช้โค้ด Login เดิม) ...*/
    e.preventDefault(); setIsLoading(true); setLoginError(false);
    try {
      const res = await fetch(`${API_URL}?action=verifyLogin&user=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (data.success) { sessionStorage.setItem("isAdminLoggedIn", "true"); setIsLoggedIn(true); loadAllData(); } 
      else setLoginError(true);
    } catch (err) { setLoginError(true); } finally { setIsLoading(false); }
  };
  const handleLogout = () => { sessionStorage.removeItem("isAdminLoggedIn"); setIsLoggedIn(false); };

  const loadAllData = () => {
    setIsTableLoading(true);
    fetch(`${API_URL}?action=getDashboardStats`).then(res => res.json()).then(data => setStats(data));
    fetch(`${API_URL}?action=getPendingRequests`).then(res => res.json()).then(data => { setPendingRequests(data); setIsTableLoading(false); });
  };

  // ================= ระบบจัดการ Modal (Step-by-Step) =================
  const openManageModal = async (rowNum) => {
    setShowModal(true);
    setModalLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=getSingleRequest&row=${rowNum}`);
      const data = await res.json();
      setReqData(data);
      
      // อัปเดตข้อมูลลงฟอร์ม
      setFormData({
        editRowNumber: data.row,
        editLicenseNo: data.licenseNo || '',
        editApproveDate: data.approveDate || new Date().toISOString().split('T')[0],
        editDocStatus: data.docStatus === 'เอกสารไม่ครบ' ? 'ไม่ครบ' : 'ครบ',
        editOfficerName: data.officerName || '',
        receiptBook: data.receiptBook || '',
        receiptNo: data.receiptNo || '',
        receiptDate: data.receiptDate || new Date().toISOString().split('T')[0],
        inspectConditions: data.inspectConditions || ''
      });

      // กำหนด Step อัตโนมัติจากสถานะ
      let step = 1;
      if (data.docStatus === "ตรวจสอบแล้ว") step = 2;
      if (data.receiptNo && data.receiptNo !== "") step = 3;
      setCurrentStep(step);

    } catch (error) {
      alert("ไม่สามารถดึงข้อมูลได้");
    } finally {
      setModalLoading(false);
    }
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ฟังก์ชันยิง API แบบ POST เพื่อบันทึกข้อมูล
  const saveStepData = async (actionName, successMessage, nextStep) => {
    setIsLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: actionName, formObject: formData })
      });
      const result = await res.json();
      if (result.status === "success") {
        alert(successMessage);
        loadAllData(); // รีเฟรชตารางหลังบ้าน
        if (nextStep === 'close') setShowModal(false);
        else setCurrentStep(nextStep);
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async (actionName) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=${actionName}&row=${formData.editRowNumber}`);
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank');
    } catch (err) { alert("ปริ้นเอกสารไม่สำเร็จ"); } finally { setIsLoading(false); }
  };

  // ================= ส่วนหน้าจอ Login =================
  if (!isLoggedIn) { /*... โค้ดหน้า Login ตัดออกเพื่อประหยัดบรรทัด (ใช้เหมือนเดิม) ...*/
     return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)" }}>
        <div className="card border-0 rounded-4 shadow-lg" style={{ maxWidth: "400px", width: "100%" }}>
          <div className="card-body p-5">
            <div className="text-center mb-4"><i className="bi bi-shield-lock text-primary" style={{ fontSize: "3rem" }}></i><h4 className="fw-bold mt-2">ระบบจัดการ อภ.1</h4></div>
            <form onSubmit={handleLogin}>
              <div className="mb-3"><label className="form-label fw-bold">ชื่อผู้ใช้</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="form-control" required /></div>
              <div className="mb-4"><label className="form-label fw-bold">รหัสผ่าน</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-control" required /></div>
              {loginError && <div className="alert alert-danger py-2 text-center">รหัสผ่านไม่ถูกต้อง!</div>}
              <button type="submit" className="btn btn-primary w-100 fw-bold py-2" disabled={isLoading}>{isLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ================= ส่วนหน้าจอหลัก =================
  return (
    <div className="d-flex" style={{ minHeight: "100vh", backgroundColor: "#f4f7fc" }}>
      
      {/* แถบเมนูด้านซ้าย */}
      <nav className="sidebar">
        <div className="text-center pt-5 pb-3 border-bottom mb-4">
          <i className="bi bi-building-check text-primary" style={{ fontSize: "2.5rem", lineHeight: 1 }}></i>
          <div className="fw-bold fs-5 text-dark mt-2">ระบบใบอนุญาต</div>
          <div className="small text-muted">กิจการที่เป็นอันตรายต่อสุขภาพ</div>
        </div>
        <div className="nav-item-menu"><a className="nav-link-menu active"><i className="bi bi-grid-1x2-fill"></i> แดชบอร์ด</a></div>
        <div className="nav-item-menu"><a className="nav-link-menu text-muted"><i className="bi bi-clock-history"></i> ประวัติคำขอ</a></div>
        <div className="nav-item-menu mt-4 pt-4 border-top"><Link href="/form" className="nav-link-menu text-primary" style={{ backgroundColor: "#eef2ff" }}><i className="bi bi-plus-circle-fill"></i> เพิ่มกิจการใหม่</Link></div>
      </nav>

      {/* เนื้อหาหลัก */}
      <div className="flex-grow-1 d-flex flex-column" style={{ width: "calc(100% - 260px)" }}>
        <header className="topbar">
          <h5 className="mb-0 fw-bold text-dark">ภาพรวมระบบ (Dashboard)</h5>
          <button className="btn btn-light btn-sm fw-bold text-danger rounded-pill px-3" onClick={handleLogout}><i className="bi bi-box-arrow-right"></i> ออกจากระบบ</button>
        </header>

        <div className="container-fluid p-4">
          {/* สถิติ */}
          <div className="row g-3 mb-4">
            <div className="col-md-4"><div className="card stat-card h-100"><div className="card-body p-4 d-flex justify-content-between"><div><h6 className="text-muted fw-bold">คำขอทั้งหมด</h6><h3 className="fw-bold text-primary mb-0">{stats.total}</h3></div><div className="icon-box bg-primary bg-opacity-10 text-primary"><i className="bi bi-files"></i></div></div></div></div>
            <div className="col-md-4"><div className="card stat-card h-100"><div className="card-body p-4 d-flex justify-content-between"><div><h6 className="text-muted fw-bold">รอตรวจสอบ</h6><h3 className="fw-bold text-warning mb-0">{stats.pending}</h3></div><div className="icon-box bg-warning bg-opacity-10 text-warning"><i className="bi bi-hourglass-split"></i></div></div></div></div>
            <div className="col-md-4"><div className="card stat-card h-100"><div className="card-body p-4 d-flex justify-content-between"><div><h6 className="text-muted fw-bold">อนุมัติแล้ว</h6><h3 className="fw-bold text-success mb-0">{stats.approved}</h3></div><div className="icon-box bg-success bg-opacity-10 text-success"><i className="bi bi-check-circle-fill"></i></div></div></div></div>
          </div>

          {/* ตารางรอตรวจสอบ */}
          <div className="card table-card">
            <div className="card-header bg-white p-4 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold"><i className="bi bi-list-task text-primary me-2"></i>รายการคำขอ / รอตรวจสอบ</h5>
              <button className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold" onClick={loadAllData}><i className="bi bi-arrow-clockwise"></i> รีเฟรช</button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr><th className="px-4 py-3 text-muted">วันที่ส่งคำขอ</th><th className="py-3 text-muted">ชื่อผู้ขออนุญาต</th><th className="py-3 text-muted">ชื่อกิจการ</th><th className="py-3 text-muted text-center">จัดการ</th></tr>
                  </thead>
                  <tbody>
                    {isTableLoading ? ( <tr><td colSpan="4" className="text-center py-5"><div className="spinner-border text-primary spinner-border-sm me-2"></div> กำลังโหลด...</td></tr> ) 
                    : pendingRequests.length === 0 ? ( <tr><td colSpan="4" className="text-center py-5 text-success fw-bold"><i className="bi bi-check-circle me-1"></i> ไม่มีคำขอค้างตรวจสอบ</td></tr> ) 
                    : ( pendingRequests.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4">{item.timestamp}</td><td className="fw-bold">{item.applicantName}</td><td>{item.businessName}</td>
                          <td className="text-center">
                            <button className="btn btn-sm btn-primary px-3 rounded-pill fw-bold" onClick={() => openManageModal(item.row)}>
                              <i className="bi bi-ui-checks-grid"></i> จัดการคำขอ
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL จัดการคำขอแบบ Step-by-Step ================= */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-custom">
            
            {/* ส่วนหัว Modal */}
            <div className="d-flex justify-content-between align-items-center bg-primary text-white p-4" style={{ borderRadius: "20px 20px 0 0" }}>
              <h5 className="mb-0 fw-bold"><i className="bi bi-clipboard-check me-2"></i> จัดการคำขอ อภ.1</h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
            </div>

            {modalLoading ? (
               <div className="text-center py-5 my-5"><div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}}></div><div className="mt-3 text-muted">กำลังโหลดข้อมูล...</div></div>
            ) : (
              <div className="p-4 bg-light">
                {/* ข้อมูลพื้นฐานและเอกสารแนบ */}
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body p-3">
                    <div className="row">
                      <div className="col-md-6"><small className="text-muted d-block">ชื่อผู้ขออนุญาต</small><strong className="text-primary fs-5">{reqData?.applicantName}</strong></div>
                      <div className="col-md-6"><small className="text-muted d-block">ชื่อกิจการ</small><strong className="fs-5">{reqData?.businessName}</strong></div>
                    </div>
                    <div className="mt-3 pt-3 border-top">
                      <small className="text-muted mb-2 d-block"><i className="bi bi-paperclip"></i> เอกสารแนบ (คลิกเพื่อดู)</small>
                      <div className="d-flex flex-wrap gap-2">
                        {reqData?.docs?.map((doc, i) => doc.link ? (
                          <a key={i} href={doc.link} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary rounded-pill">
                            <i className="bi bi-file-earmark-text text-primary"></i> {doc.name}
                          </a>
                        ) : null)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* แถบ Stepper */}
                <div className="stepper-container mb-5">
                  <div className="stepper-line"></div>
                  <div className="stepper-line-progress" style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}></div>
                  
                  <div className={`step-item ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`} onClick={() => setCurrentStep(1)}>
                    <div className="step-circle"><i className={currentStep > 1 ? "bi bi-check-lg" : "bi bi-1-circle"}></i></div>
                    <div className="step-label">ตรวจเอกสาร</div>
                  </div>
                  <div className={`step-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`} onClick={() => setCurrentStep(2)}>
                    <div className="step-circle"><i className={currentStep > 2 ? "bi bi-check-lg" : "bi bi-2-circle"}></i></div>
                    <div className="step-label">ชำระเงิน</div>
                  </div>
                  <div className={`step-item ${currentStep === 3 ? 'active' : ''}`} onClick={() => setCurrentStep(3)}>
                    <div className="step-circle"><i className="bi bi-3-circle"></i></div>
                    <div className="step-label">ออกใบอนุญาต</div>
                  </div>
                </div>

                {/* เนื้อหาแต่ละ Step */}
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-4">
                    
                    {/* STEP 1: ตรวจสอบเอกสาร */}
                    {currentStep === 1 && (
                      <div>
                        <h5 className="fw-bold text-primary mb-3"><i className="bi bi-file-earmark-check me-2"></i> 1. ตรวจสอบเอกสารและออกเลขรับเรื่อง</h5>
                        <div className="row g-3">
                          <div className="col-md-6"><label className="form-label small">เลขที่รับเรื่อง/ใบอนุญาต</label><input type="text" className="form-control" name="editLicenseNo" value={formData.editLicenseNo} onChange={handleFormChange} required /></div>
                          <div className="col-md-6"><label className="form-label small">วันที่รับเรื่อง</label><input type="date" className="form-control" name="editApproveDate" value={formData.editApproveDate} onChange={handleFormChange} required /></div>
                          <div className="col-md-6">
                            <label className="form-label small">ผลการตรวจสอบ</label>
                            <select className="form-select" name="editDocStatus" value={formData.editDocStatus} onChange={handleFormChange}>
                              <option value="ครบ">เอกสารครบถ้วน (รอชำระเงิน)</option>
                              <option value="ไม่ครบ">เอกสารไม่ครบ</option>
                            </select>
                          </div>
                          <div className="col-md-6"><label className="form-label small">เจ้าหน้าที่</label><input type="text" className="form-control" name="editOfficerName" value={formData.editOfficerName} onChange={handleFormChange} required /></div>
                        </div>
                        <div className="text-end mt-4">
                          <button className="btn btn-primary px-4 fw-bold" onClick={() => saveStepData('updateLicenseData', 'บันทึกผลตรวจสอบเอกสารสำเร็จ!', 2)} disabled={isLoading}>
                            {isLoading ? "กำลังบันทึก..." : "บันทึกและไปสเต็ป 2" } <i className="bi bi-arrow-right"></i>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: ชำระเงิน */}
                    {currentStep === 2 && (
                      <div>
                        <h5 className="fw-bold text-success mb-3"><i className="bi bi-cash-stack me-2"></i> 2. พิมพ์ใบแจ้ง & บันทึกใบเสร็จ</h5>
                        <div className="p-3 bg-success bg-opacity-10 border border-success rounded-3 mb-4 d-flex justify-content-between align-items-center">
                          <span className="text-success fw-bold"><i className="bi bi-printer me-2"></i>พิมพ์ใบแจ้งเพื่อให้ผู้ขอไปชำระเงินที่กองคลัง</span>
                          <button className="btn btn-success fw-bold" onClick={() => handlePrint('createNotice')} disabled={isLoading}><i className="bi bi-file-earmark-pdf"></i> พิมพ์ใบแจ้งชำระเงิน</button>
                        </div>
                        <h6 className="fw-bold text-muted border-bottom pb-2 mb-3">บันทึกข้อมูลใบเสร็จรับเงิน (หลังชำระเงินแล้ว)</h6>
                        <div className="row g-3">
                          <div className="col-md-4"><label className="form-label small">เล่มที่</label><input type="text" className="form-control" name="receiptBook" value={formData.receiptBook} onChange={handleFormChange} /></div>
                          <div className="col-md-4"><label className="form-label small">เลขที่</label><input type="text" className="form-control" name="receiptNo" value={formData.receiptNo} onChange={handleFormChange} /></div>
                          <div className="col-md-4"><label className="form-label small">วันที่ลงรับเงิน</label><input type="date" className="form-control" name="receiptDate" value={formData.receiptDate} onChange={handleFormChange} /></div>
                        </div>
                        <div className="text-end mt-4">
                          <button className="btn btn-success px-4 fw-bold" onClick={() => saveStepData('savePaymentData', 'บันทึกใบเสร็จสำเร็จ!', 3)} disabled={isLoading}>
                            {isLoading ? "กำลังบันทึก..." : "บันทึกใบเสร็จและไปสเต็ป 3" } <i className="bi bi-arrow-right"></i>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 3: ตรวจสถานที่ & ออกใบอนุญาต */}
                    {currentStep === 3 && (
                      <div>
                        <h5 className="fw-bold text-danger mb-3"><i className="bi bi-geo-alt-fill me-2"></i> 3. บันทึกผลตรวจสถานที่ & ออกใบอนุญาต</h5>
                        <div className="mb-4">
                          <label className="form-label fw-bold">เงื่อนไขเฉพาะ (ที่ผู้ขอต้องปฏิบัติตาม)</label>
                          <textarea className="form-control" rows="3" name="inspectConditions" value={formData.inspectConditions} onChange={handleFormChange} placeholder="ระบุเงื่อนไข..."></textarea>
                          <div className="text-end mt-2">
                            <button className="btn btn-outline-danger btn-sm px-3 fw-bold" onClick={() => saveStepData('saveInspectionData', 'บันทึกผลตรวจสถานที่สำเร็จ!', 3)} disabled={isLoading}>
                              {isLoading ? "กำลังบันทึก..." : <><i className="bi bi-save"></i> บันทึกเงื่อนไข</>}
                            </button>
                          </div>
                        </div>
                        <div className="p-4 bg-danger bg-opacity-10 border border-danger rounded-3 text-center mt-4">
                          <h6 className="text-danger fw-bold mb-3">เมื่อตรวจสอบเสร็จสิ้น สามารถพิมพ์ใบอนุญาต อภ.1 (พร้อมตารางสลักหลัง) ได้เลย</h6>
                          <button className="btn btn-danger btn-lg fw-bold px-5" onClick={() => handlePrint('createLicense')} disabled={isLoading}>
                            {isLoading ? "กำลังสร้างเอกสาร..." : <><i className="bi bi-award"></i> ออกใบอนุญาต อภ.1</>}
                          </button>
                        </div>
                        <div className="text-end mt-4">
                          <button className="btn btn-secondary px-4 fw-bold" onClick={() => setShowModal(false)}>เสร็จสิ้นภารกิจ (ปิดหน้าต่าง)</button>
                        </div>
                      </div>
                    )}
                    
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}