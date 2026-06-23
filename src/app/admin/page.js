"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminPage() {
  // === ระบบ Login ===
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // === ระบบเปลี่ยนหน้าจอ (Tab Menu) ===
  const [activeTab, setActiveTab] = useState("dashboard");

  // === สถิติและรายการในตาราง/การ์ด ===
  const [stats, setStats] = useState({ total: '-', pending: '-', approved: '-', expiringSoon: '-', expired: '-' });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // === หน้าต่างจัดการคำขอแบบ Step-by-Step ===
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [reqData, setReqData] = useState(null);
  
  // === บล็อกข้อมูลสิทธิ์เจ้าหน้าที่ (ผูกค่ากับ Input เพื่อแก้ไขมือได้) ===
  const [modalLicenseNo, setModalLicenseNo] = useState("");
  const [modalApproveDate, setModalApproveDate] = useState("");
  const [modalExpireDate, setModalExpireDate] = useState("");
  
  // ฟอร์มเก็บข้อมูลค่าธรรมเนียมและเจ้าหน้าที่ตรวจสถานที่
  const [formData, setFormData] = useState({
    editRowNumber: '',
    editDocStatus: 'ครบ',
    editOfficerName: '',
    receiptBook: '',
    receiptNo: '',
    receiptDate: '',
    inspectConditions: ''
  });

  // 🔴 นำ URL ของ Web App (Google Apps Script) วางตรงนี้ 🔴
  const API_URL = "https://script.google.com/macros/s/AKfycbzQO_vdqxqgZBg3ok8KmZ3ETLbFeTY2VAhnEjJH5eee5evZ8lYXY8fVmqenFJPwQ74E/exec";

  useEffect(() => {
    if (sessionStorage.getItem("isAdminLoggedIn") === "true") {
      setIsLoggedIn(true);
      loadAllData();
    }
  }, []);

  // === จัดการระบบ Login ===
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(false);
    try {
      const res = await fetch(`${API_URL}?action=verifyLogin&user=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("isAdminLoggedIn", "true");
        setIsLoggedIn(true);
        loadAllData();
      } else {
        setLoginError(true);
      }
    } catch (err) {
      setLoginError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminLoggedIn");
    setIsLoggedIn(false);
  };

  // === โหลดข้อมูลหน้ารายการรอตรวจสอบ (Dashboard) ===
  const loadAllData = () => {
    setIsTableLoading(true);
    fetch(`${API_URL}?action=getDashboardStats`).then(res => res.json()).then(data => setStats(data));
    fetch(`${API_URL}?action=getPendingRequests`).then(res => res.json()).then(data => {
      setPendingRequests(data);
      setIsTableLoading(false);
    });
  };

  // === โหลดข้อมูลหน้าประวัติคำขอ (ทะเบียนแบบการ์ด) ===
  const loadHistoryData = () => {
    setIsHistoryLoading(true);
    fetch(`${API_URL}?action=getHistoryRequests`)
      .then(res => res.json())
      .then(data => {
        setHistoryRequests(data);
        setIsHistoryLoading(false);
      })
      .catch(() => setIsHistoryLoading(false));
  };

  // === ระบบสลับแท็บเมนู ===
  const changeTab = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'dashboard') loadAllData();
    if (tabName === 'history') loadHistoryData();
  };

  // === กดเปิดหน้าต่างจัดการคำขอ (Modal Step-by-Step) ===
  const openManageModal = async (rowNum) => {
    setShowModal(true);
    setModalLoading(true);
    try {
      // 1. ดึงข้อมูลคำขอแถวนั้น ๆ มาแสดง
      const res = await fetch(`${API_URL}?action=getSingleRequest&row=${rowNum}`);
      const data = await res.json();
      setReqData(data);
      
      setFormData({
        editRowNumber: data.row,
        editDocStatus: data.docStatus === 'เอกสารไม่ครบ' ? 'ไม่ครบ' : 'ครบ',
        editOfficerName: data.officerName || '',
        receiptBook: data.receiptBook || '',
        receiptNo: data.receiptNo || '',
        receiptDate: data.receiptDate || new Date().toISOString().split('T')[0],
        inspectConditions: data.inspectConditions || ''
      });

      // 2. ไปดึงเลขรันและวันที่อัตโนมัติจากเซิร์ฟเวอร์มาเตรียมหยอดลงช่องป้อนข้อมูล
      const resAuto = await fetch(`${API_URL}?action=getInitialFormData`);
      const dataAuto = await resAuto.json();
      
      if (dataAuto) {
        // หากในคลังชีตเดิมมีเลขและวันที่อยู่แล้ว ให้ใช้ค่าเก่า ไม่งั้นให้ใช้เลขรันอัตโนมัติใหม่
        setModalLicenseNo(data.licenseNo && data.licenseNo !== "-" ? data.licenseNo : dataAuto.autoNumber);
        setModalApproveDate(data.approveDate && data.approveDate !== "-" ? data.approveDate : dataAuto.dates.approveDate);
        setModalExpireDate(data.expireDate && data.expireDate !== "-" ? data.expireDate : dataAuto.dates.expireDate);
      }

      // 3. ปรับสเต็ปตามสถานะงานปัจจุบัน
      let step = 1;
      if (data.docStatus === "ตรวจสอบแล้ว") step = 2;
      if (data.receiptNo && data.receiptNo !== "") step = 3;
      setCurrentStep(step);

    } catch (error) {
      alert("เกิดข้อผิดพลาดในการดึงข้อมูลคำขอ");
    } finally {
      setModalLoading(false);
    }
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // === ส่งข้อมูลไปอัปเดตและบันทึกลง Google Sheets ===
  const saveStepData = async (actionName, successMessage, nextStep) => {
    setIsLoading(true);
    
    // รวมร่างข้อมูลทั่วไปกับข้อมูลส่วนของผู้อนุมัติที่อาจถูกแก้ไขด้วยมือ
    const finalPayload = {
      ...formData,
      editLicenseNo: modalLicenseNo,
      editApproveDate: modalApproveDate,
      editExpireDate: modalExpireDate
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: actionName, formObject: finalPayload })
      });
      const result = await res.json();
      if (result.status === "success") {
        alert(successMessage);
        if (activeTab === 'dashboard') loadAllData();
        if (activeTab === 'history') loadHistoryData();
        if (nextStep === 'close') setShowModal(false); else setCurrentStep(nextStep);
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลหลังบ้าน");
    } finally {
      setIsLoading(false);
    }
  };

  // === ฟังก์ชันเรียกปริ้นเอกสาร PDF ออกทางแท็บใหม่ ===
  const handlePrint = async (actionName) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=${actionName}&row=${formData.editRowNumber}`);
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank');
    } catch (err) {
      alert("ไม่สามารถเปิดลิงก์สำหรับพิมพ์เอกสารได้");
    } finally {
      setIsLoading(false);
    }
  };

  // ================= UI ส่วนที่ 1: หน้าจอสิทธิ์การเข้าสู่ระบบ (Login) =================
  if (!isLoggedIn) {
     return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)" }}>
        <div className="card border-0 rounded-4 shadow-lg" style={{ maxWidth: "400px", width: "100%" }}>
          <div className="card-body p-5 text-center">
            <i className="bi bi-shield-lock text-primary mb-3" style={{ fontSize: "3rem" }}></i>
            <h4 className="fw-bold">ระบบจัดการ อภ.1</h4>
            <form onSubmit={handleLogin} className="text-start mt-4">
              <div className="mb-3">
                <label className="form-label fw-bold">ชื่อผู้ใช้</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="form-control" required />
              </div>
              <div className="mb-4">
                <label className="form-label fw-bold">รหัสผ่าน</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-control" required />
              </div>
              {loginError && <div className="alert alert-danger py-2 text-center" style={{fontSize:'0.9rem'}}>สิทธิ์การเข้าใช้งานไม่ถูกต้อง!</div>}
              <button type="submit" className="btn btn-primary w-100 fw-bold py-2" disabled={isLoading}>
                {isLoading ? "กำลังตรวจสอบความปลอดภัย..." : "เข้าสู่ระบบ"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ================= UI ส่วนที่ 2: โครงสร้างหลักหลังบ้าน (Main Dashboard Dashboard) =================
  return (
    <div className="d-flex" style={{ minHeight: "100vh", backgroundColor: "#f4f7fc" }}>
      
      {/* 🧭 แถบเมนูด้านซ้าย (Sidebar) */}
      <nav className="sidebar">
        <div className="text-center pt-5 pb-3 border-bottom mb-4">
          <i className="bi bi-building-check text-primary" style={{ fontSize: "2.5rem", lineHeight: 1 }}></i>
          <div className="fw-bold fs-5 text-dark mt-2">ระบบใบอนุญาต</div>
          <div className="small text-muted">กิจการที่เป็นอันตรายต่อสุขภาพ</div>
        </div>
        
        <div className="nav-item-menu">
          <a className={`nav-link-menu ${activeTab === 'dashboard' ? 'active' : 'text-muted'}`} onClick={() => changeTab('dashboard')}>
            <i className="bi bi-grid-1x2-fill"></i> แดชบอร์ดคำขอใหม่
          </a>
        </div>
        <div className="nav-item-menu">
          <a className={`nav-link-menu ${activeTab === 'history' ? 'active' : 'text-muted'}`} onClick={() => changeTab('history')}>
            <i className="bi bi-archive-fill"></i> ทะเบียนใบอนุญาต
          </a>
        </div>
        <div className="nav-item-menu">
          <a className={`nav-link-menu ${activeTab === 'map' ? 'active' : 'text-muted'}`} onClick={() => changeTab('map')}>
            <i className="bi bi-geo-alt-fill"></i> แผนที่รวมร้านค้า
          </a>
        </div>
        
        <div className="nav-item-menu mt-4 pt-4 border-top">
          <Link href="/form" className="nav-link-menu text-primary" style={{ backgroundColor: "#eef2ff" }}>
            <i className="bi bi-plus-circle-fill"></i> บันทึกรับคำขอใหม่
          </Link>
        </div>
      </nav>

      {/* 💻 พื้นที่การแสดงผลหน้าจอขวา */}
      <div className="flex-grow-1 d-flex flex-column" style={{ width: "calc(100% - 260px)" }}>
        <header className="topbar">
          <h5 className="mb-0 fw-bold text-dark">
            {activeTab === 'dashboard' && "ระบบบริหารจัดการคำขอรับใบอนุญาต (อภ.1)"}
            {activeTab === 'history' && "ทำเนียบทะเบียนใบอนุญาตที่ออกแล้ว (เรียงตามล่าสุด)"}
            {activeTab === 'map' && "ระบบส่องพิกัดแผนที่สถานประกอบการในพื้นที่"}
          </h5>
          <button className="btn btn-light btn-sm fw-bold text-danger rounded-pill px-3" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right"></i> ออกจากระบบ
          </button>
        </header>

        <div className="container-fluid p-4">
          
          {/* 📊 ส่วนที่ 2.1: แผงควบคุม TAB 1 - หน้าแดชบอร์ดสถิติและตารางงานค้าง */}
          {activeTab === 'dashboard' && (
            <>
              <div className="row g-3 mb-4">
                <div className="col-md-4"><div className="card stat-card h-100"><div className="card-body p-4 d-flex justify-content-between"><div><h6 className="text-muted fw-bold">รอตรวจสอบเอกสาร</h6><h3 className="fw-bold text-warning mb-0">{stats.pending}</h3></div><div className="icon-box bg-warning bg-opacity-10 text-warning"><i className="bi bi-hourglass-split"></i></div></div></div></div>
                <div className="col-md-4"><div className="card stat-card h-100"><div className="card-body p-4 d-flex justify-content-between"><div><h6 className="text-muted fw-bold">ออกใบอนุญาตแล้ว</h6><h3 className="fw-bold text-success mb-0">{stats.approved}</h3></div><div className="icon-box bg-success bg-opacity-10 text-success"><i className="bi bi-check-circle-fill"></i></div></div></div></div>
                <div className="col-md-4"><div className="card stat-card h-100"><div className="card-body p-4 d-flex justify-content-between"><div><h6 className="text-muted fw-bold">ใบอนุญาตหมดอายุ/ใกล้หมด</h6><h3 className="fw-bold text-danger mb-0">{Number(stats.expiringSoon || 0) + Number(stats.expired || 0)}</h3></div><div className="icon-box bg-danger bg-opacity-10 text-danger"><i className="bi bi-exclamation-triangle-fill"></i></div></div></div></div>
              </div>
              
              <div className="card table-card shadow-sm border-0">
                <div className="card-header bg-white p-4 border-bottom d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold"><i className="bi bi-list-task text-primary me-2"></i>รายการคำขอรอการตรวจสอบ</h5>
                  <button className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold" onClick={loadAllData}><i className="bi bi-arrow-clockwise"></i> รีเฟรชข้อมูล</button>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="bg-light">
                        <tr>
                          <th className="px-4 py-3 text-muted">วันที่ส่งเรื่อง</th>
                          <th className="py-3 text-muted">ชื่อผู้ยื่นคำขอ</th>
                          <th className="py-3 text-muted">ชื่อสถานประกอบการ</th>
                          <th className="py-3 text-muted text-center">ดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isTableLoading ? (
                          <tr><td colSpan="4" className="text-center py-5"><div className="spinner-border text-primary spinner-border-sm me-2"></div> ระบบกำลังสแกนหาข้อมูล...</td></tr>
                        ) : pendingRequests.length === 0 ? (
                          <tr><td colSpan="4" className="text-center py-5 text-success fw-bold"><i className="bi bi-check-circle me-1"></i> ยอดเยี่ยม! ไม่มีงานคำขอค้างตรวจสอบในระบบ</td></tr>
                        ) : (
                          pendingRequests.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 text-muted">{item.timestamp}</td>
                              <td className="fw-bold text-dark">{item.applicantName}</td>
                              <td>{item.businessName}</td>
                              <td className="text-center">
                                <button className="btn btn-sm btn-primary px-3 rounded-pill fw-bold" onClick={() => openManageModal(item.row)}>
                                  <i className="bi bi-pencil-square"></i> ตรวจสอบคำขอ
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
            </>
          )}

          {/* 🗃️ ส่วนที่ 2.2: แผงควบคุม TAB 2 - แสดงประวัติคำขออนุมัติแล้วแบบโครงสร้าง Cards สวยงาม */}
          {activeTab === 'history' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-success"><i className="bi bi-patch-check-fill me-2"></i>ทำเนียบใบอนุญาตประกอบกิจการ อภ.1</h5>
                <button className="btn btn-outline-success btn-sm rounded-pill px-3 fw-bold" onClick={loadHistoryData}><i className="bi bi-arrow-clockwise"></i> อัปเดตข้อมูล</button>
              </div>

              {isHistoryLoading ? (
                <div className="text-center py-5"><div className="spinner-border text-success"></div><p className="mt-2 text-muted small">กำลังสืบค้นสารบบตารางทะเบียน...</p></div>
              ) : historyRequests.length === 0 ? (
                <div className="text-center py-5 bg-white rounded-4 p-5 border"><i className="bi bi-inbox fs-1 text-muted opacity-50"></i><p className="text-muted fw-bold mt-2">ไม่พบรายชื่อผู้ประกอบการที่ผ่านการอนุมัติใบอนุญาต</p></div>
              ) : (
                <div className="row g-3">
                  {[...historyRequests].sort((a, b) => b.row - a.row).map((item, index) => (
                    <div key={index} className="col-lg-4 col-md-6">
                      <div className="card shadow-sm border-0 h-100 rounded-4 overflow-hidden position-relative" style={{background: '#ffffff'}}>
                        <div className="card-body p-4">
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <span className="badge bg-success bg-opacity-10 text-success fw-bold px-3 py-2 rounded-pill" style={{fontSize:'0.75rem'}}>ออกใบอนุญาตแล้ว</span>
                            <small className="text-muted small"><i className="bi bi-calendar2-check"></i> {item.approveDate}</small>
                          </div>
                          <h6 className="text-primary fw-bold mb-1" style={{fontSize: '0.85rem'}}>เลขที่ใบอนุญาต: {item.licenseNo}</h6>
                          <h5 className="fw-bold text-dark text-truncate mb-2">{item.businessName}</h5>
                          <p className="text-muted small mb-3 text-truncate"><i className="bi bi-person me-1"></i>ผู้รับใบอนุญาต: {item.applicantName}</p>
                          <div className="border-top pt-3 d-flex justify-content-between align-items-center mt-3">
                            <div>
                              <small className="text-muted d-block" style={{fontSize:'0.75rem'}}>วันที่สิ้นอายุใบอนุญาต</small>
                              <strong className="text-danger" style={{fontSize: '0.95rem'}}><i className="bi bi-calendar-x"></i> {item.editExpireDate || item.expireDate || "-"}</strong>
                            </div>
                            <button className="btn btn-sm btn-light text-primary px-3 rounded-pill fw-bold" onClick={() => openManageModal(item.row)}>เรียกดู</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 🗺️ ส่วนที่ 2.3: แผงควบคุม TAB 3 - ระบบแผนที่รวมพิกัด (เตรียมไว้สวมสคริปต์เต็มจอ) */}
          {activeTab === 'map' && (
            <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white mt-4">
              <i className="bi bi-map-fill text-muted mb-3 d-block opacity-25" style={{ fontSize: "4rem" }}></i>
              <h4 className="text-dark fw-bold">ระบบแผนที่สารสนเทศภูมิศาสตร์ (GIS)</h4>
              <p className="text-muted mx-auto" style={{maxWidth: '500px'}}>เตรียมเชื่อมพิกัดละติจูด/ลองจิจูดจากตารางทั้งหมดมาปักหมุด แสดงผลแผนที่รวมร้านค้าที่เป็นอันตรายต่อสุขภาพในตําบลหนองเต็ง เร็ว ๆ นี้ 🚧</p>
            </div>
          )}

        </div>
      </div>

      {/* ================= MODAL หน้าต่างกล่องจัดการสถานะคำขอแบบ STEP-BY-STEP ================= */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-custom">
            
            {/* หัวข้อ Modal */}
            <div className="d-flex justify-content-between align-items-center bg-primary text-white p-4" style={{ borderRadius: "20px 20px 0 0" }}>
              <h5 className="mb-0 fw-bold"><i className="bi bi-shield-check me-2"></i> ศูนย์ตรวจรับขั้นตอนการออกใบอนุญาต อภ.1</h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
            </div>

            {modalLoading ? (
               <div className="text-center py-5 my-5"><div className="spinner-border text-primary" style={{width:'3rem', height:'3rem'}}></div><div className="mt-3 text-muted small">กำลังดึงฐานแฟ้มและเอกสารหลักฐาน...</div></div>
            ) : (
              <div className="p-4 bg-light" style={{maxHeight:'80vh', overflowY:'auto'}}>
                
                {/* แผงข้อมูลร้านค้าและปุ่มคลิกส่องเอกสารแนบ */}
                <div className="card border-0 shadow-sm mb-4 rounded-3">
                  <div className="card-body p-4">
                    <div className="row g-3">
                      <div className="col-md-6"><small className="text-muted d-block">ชื่อผู้ยื่นคำขออนุญาต</small><strong className="text-dark fs-5">{reqData?.applicantName}</strong></div>
                      <div className="col-md-6"><small className="text-muted d-block">ชื่อสถานประกอบการป้ายร้าน</small><strong className="text-primary fs-5">{reqData?.businessName}</strong></div>
                      <div className="col-12 mt-2"><small className="text-muted d-block">ประเภทกลุ่มกิจการ</small><span className="badge bg-secondary bg-opacity-10 text-secondary fw-medium p-2 mt-1 rounded">{reqData?.businessType}</span></div>
                    </div>
                    
                    {/* ชุดปุ่มกดเปิดส่องดูลิงก์เอกสารแนบจาก Google Drive */}
                    <div className="mt-4 pt-3 border-top">
                      <small className="text-muted mb-2 d-block fw-bold"><i className="bi bi-folder2-open"></i> เอกสารหลักฐานประกอบคำขอ (คลิกเพื่อส่องแฟ้มแนบ)</small>
                      <div className="d-flex flex-wrap gap-2">
                        {reqData?.docs?.map((doc, i) => doc.link ? (
                          <a key={i} href={doc.link} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-dark rounded-pill" style={{fontSize: '0.8rem'}}>
                            <i className="bi bi-file-earmark-pdf-fill text-danger"></i> {doc.name}
                          </a>
                        ) : null)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🗺️ เส้นระดับความคืบหน้าการอนุมัติแบบขั้นตอน (Stepper Status Tracking) */}
                <div className="stepper-container mb-5">
                  <div className="stepper-line"></div>
                  <div className="stepper-line-progress" style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}></div>
                  
                  <div className={`step-item ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`} onClick={() => setCurrentStep(1)}>
                    <div className="step-circle"><i className={currentStep > 1 ? "bi bi-check-lg" : "bi bi-1-circle"}></i></div>
                    <div className="step-label">1. ตรวจเอกสาร</div>
                  </div>
                  <div className={`step-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`} onClick={() => setCurrentStep(2)}>
                    <div className="step-circle"><i className={currentStep > 2 ? "bi bi-check-lg" : "bi bi-2-circle"}></i></div>
                    <div className="step-label">2. ชำระเงินกองคลัง</div>
                  </div>
                  <div className={`step-item ${currentStep === 3 ? 'active' : ''}`} onClick={() => setCurrentStep(3)}>
                    <div className="step-circle"><i className="bi bi-3-circle"></i></div>
                    <div className="step-label">3. ตรวจสอบ/ออกใบอนุญาต</div>
                  </div>
                </div>

                {/* กล่องบรรจุเนื้อหาฟอร์มแยกสเต็ปการทำหน้าที่ */}
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-4">
                    
                    {/* STEP 1: หน้าต่างตรวจสอบคุณสมบัติเอกสารและลงเลขรับเรื่อง */}
                    {currentStep === 1 && (
                      <div>
                        <h5 className="fw-bold text-primary mb-3"><i className="bi bi-file-earmark-text me-2"></i>ขั้นตอนที่ 1: การตรวจสอบเอกสารหลักฐานเบื้องต้น</h5>
                        
                        {/* 🔴 ช่องป้อนข้อมูลผู้อนุมัติ (รับเลขอัตโนมัติ + แก้ไขด้วยมือได้อิสระ) 🔴 */}
                        <div className="bg-white p-3 rounded-4 border border-primary border-opacity-50 row g-3 mb-4">
                          <div className="col-12"><small className="text-primary fw-bold"><i className="bi bi-magic"></i> ระบบคำนวณรันเลขอัตโนมัติถัดไปให้อ่าน (เจ้าหน้าที่สามารถลบพิมพ์ทับแก้ไขได้เอง)</small></div>
                          
                          <div className="col-md-6">
                            <label className="form-label small fw-bold">เลขที่รับเรื่อง / เลขที่ใบอนุญาต</label>
                            <input 
                              type="text" 
                              className="form-control fw-bold border-primary" 
                              value={modalLicenseNo} 
                              onChange={(e) => setModalLicenseNo(e.target.value)} // บังคับอัปเดต state เมื่อพิมพ์แก้ทับ
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small fw-bold">วันที่ลงรับเรื่อง</label>
                            <input 
                              type="date" 
                              className="form-control" 
                              value={modalApproveDate} 
                              onChange={(e) => setModalApproveDate(e.target.value)} 
                            />
                          </div>
                        </div>

                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label small">สรุปสถานะความสมบูรณ์แฟ้มเอกสาร</label>
                            <select className="form-select" name="editDocStatus" value={formData.editDocStatus} onChange={handleFormChange}>
                              <option value="ครบ">เอกสารครบถ้วนถูกต้อง (ผ่านไปสเต็ปเก็บเงินค่าธรรมเนียม)</option>
                              <option value="ไม่ครบ">เอกสารไม่ครบถ้วน / ตีเรื่องกลับให้แก้ไข</option>
                            </select>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small">ชื่อเจ้าหน้าที่ผู้ตรวจเรื่อง</label>
                            <input type="text" className="form-control" name="editOfficerName" value={formData.editOfficerName} onChange={handleFormChange} placeholder="ระบุชื่อผู้ตรวจสอบ" required />
                          </div>
                        </div>
                        
                        <div className="text-end mt-4 pt-3 border-top">
                          <button className="btn btn-primary px-4 fw-bold rounded-pill" onClick={() => saveStepData('updateLicenseData', 'บันทึกสถานะการรับเอกสารและเลขรับเรื่องสำเร็จ!', 2)} disabled={isLoading}>
                            {isLoading ? "กำลังบันทึกฐานข้อมูล..." : <>บันทึกข้อมูลและไปสเต็ปถัดไป <i className="bi bi-arrow-right"></i></> }
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: หน้าต่างออกใบแจ้งความประสงค์ชำระเงินและบันทึกเลขที่ใบเสร็จรับเงิน */}
                    {currentStep === 2 && (
                      <div>
                        <h5 className="fw-bold text-success mb-3"><i className="bi bi-cash-coin me-2"></i>ขั้นตอนที่ 2: ระบบการรับชำระเงินและค่าธรรมเนียมใบอนุญาต</h5>
                        <div className="p-3 bg-success bg-opacity-10 border border-success border-opacity-20 rounded-3 mb-4 d-flex justify-content-between align-items-center">
                          <span className="text-success small fw-bold"><i className="bi bi-printer-fill me-1"></i> พิมพ์ใบแจ้งหนี้/คำสั่งชำระเงินส่งตัวให้ผู้ประกอบการไปชำระที่กองคลัง</span>
                          <button className="btn btn-success btn-sm fw-bold rounded-pill px-3" onClick={() => handlePrint('createNotice')} disabled={isLoading}><i className="bi bi-file-earmark-pdf"></i> ออกใบแจ้งชำระเงิน</button>
                        </div>
                        
                        <h6 className="fw-bold text-muted border-bottom pb-2 mb-3">ลงทะเบียนบันทึกเลขหลักฐานใบเสร็จ (หลังจากผู้ประกอบการจ่ายเงินแล้ว)</h6>
                        <div className="row g-3">
                          <div className="col-md-4"><label className="form-label small">ใบเสร็จเล่มที่</label><input type="text" className="form-control" name="receiptBook" value={formData.receiptBook} onChange={handleFormChange} /></div>
                          <div className="col-md-4"><label className="form-label small">ใบเสร็จเลขที่</label><input type="text" className="form-control" name="receiptNo" value={formData.receiptNo} onChange={handleFormChange} /></div>
                          <div className="col-md-4"><label className="form-label small">วันที่ออกใบเสร็จ</label><input type="date" className="form-control" name="receiptDate" value={formData.receiptDate} onChange={handleFormChange} /></div>
                        </div>
                        
                        <div className="text-end mt-4 pt-3 border-top">
                          <button className="btn btn-success px-4 fw-bold rounded-pill" onClick={() => saveStepData('savePaymentData', 'ลงบันทึกใบเสร็จค่าธรรมเนียมเข้าระบบเรียบร้อย!', 3)} disabled={isLoading}>
                            {isLoading ? "กำลังบันทึกเล่มเลข..." : <>บันทึกใบเสร็จและไปขั้นตอนสุดท้าย <i className="bi bi-arrow-right"></i></>}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 3: หน้าต่างบันทึกเงื่อนไขป้องปรามสุขาภิบาลและสั่งพิมพ์ใบอนุญาต อภ.1 */}
                    {currentStep === 3 && (
                      <div>
                        <h5 className="fw-bold text-danger mb-3"><i className="bi bi-award-fill me-2"></i>ขั้นตอนที่ 3: บันทึกตรวจสถานประกอบการ และ พิมพ์ใบอนุญาตประกอบกิจการ</h5>
                        
                        {/* 🔴 ส่วนตรวจสอบและปรับเปลี่ยนปฏิทินวันหมดอายุโดยผู้อนุมัติ 🔴 */}
                        <div className="bg-white p-3 rounded-4 border border-danger border-opacity-50 row g-3 mb-4">
                          <div className="col-12"><small className="text-danger fw-bold"><i className="bi bi-calendar-range"></i> ตรวจสอบกำหนดเวลาการคุ้มครอง (ระบบคำนวณบวกให้ 1 ปีอัตโนมัติ ผู้อนุมัติคลิกปรับแก้ปฏิทินเองได้)</small></div>
                          <div className="col-12">
                            <label className="form-label small fw-bold text-danger">วันสิ้นสุด/หมดอายุใบอนุญาต</label>
                            <input 
                              type="date" 
                              className="form-control border-danger fw-bold text-danger" 
                              value={modalExpireDate} 
                              onChange={(e) => setModalExpireDate(e.target.value)} // เปลี่ยนวันหมดอายุได้มือได้เอง
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="form-label small fw-bold">เงื่อนไขเฉพาะแนบท้ายใบอนุญาต (คำสั่งเพื่อสุขาภิบาลสิ่งแวดล้อม)</label>
                          <textarea className="form-control" rows="3" name="inspectConditions" value={formData.inspectConditions} onChange={handleFormChange} placeholder="ตัวอย่าง: ต้องจัดทำระบบบำบัดไขมันก่อนปล่อยน้ำเสียทิ้งลงสู่ท่อระบายน้ำสาธารณะ..."></textarea>
                          <div className="text-end mt-2">
                            <button className="btn btn-outline-danger btn-sm px-3 fw-bold rounded-pill" onClick={() => saveStepData('saveInspectionData', 'บันทึกเงื่อนไขแนบท้ายสุขาภิบาลสำเร็จ!', 3)} disabled={isLoading}>
                              {isLoading ? "กำลังเซฟเงื่อนไข..." : <><i className="bi bi-save"></i> อัปเดตบันทึกเงื่อนไข</>}
                            </button>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-danger bg-opacity-10 border border-danger border-opacity-20 rounded-4 text-center mt-4 shadow-sm">
                          <h6 className="text-danger fw-bold mb-3"><i className="bi bi-printer"></i> ตรวจสอบความเรียบร้อยครบถ้วนแล้ว สั่งพิมพ์ใบอนุญาตฉบับจริงส่งมอบงาน</h6>
                          <button className="btn btn-danger btn-lg fw-bold px-5 rounded-pill shadow" onClick={() => handlePrint('createLicense')} disabled={isLoading}>
                            {isLoading ? <><span className="spinner-border spinner-border-sm me-2"></span> กำลังประมวลผล PDF...</> : <><i className="bi bi-file-earmark-pdf-fill"></i> อนุมัติและพิมพ์ใบอนุญาต อภ.1</>}
                          </button>
                        </div>
                        
                        <div className="text-end mt-4 pt-3 border-top">
                          <button className="btn btn-secondary px-4 fw-bold rounded-pill" onClick={() => saveStepData('saveInspectionData', 'อนุมัติปิดเคสเรียบร้อย!', 'close')}>
                            เสร็จสิ้นกระบวนการอนุมัติ (ปิดหน้านี้)
                          </button>
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