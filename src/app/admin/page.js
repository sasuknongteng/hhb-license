"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // สถานะแดชบอร์ด
  const [stats, setStats] = useState({ total: '-', pending: '-', approved: '-', expiringSoon: '-', expired: '-' });

  // 🔴 นำ URL ของ Web App วางตรงนี้ 🔴
  const API_URL = "https://script.google.com/macros/s/AKfycbzQO_vdqxqgZBg3ok8KmZ3ETLbFeTY2VAhnEjJH5eee5evZ8lYXY8fVmqenFJPwQ74E/exec";

  useEffect(() => {
    // เช็คว่าเคยล็อกอินค้างไว้หรือไม่
    if (sessionStorage.getItem("isAdminLoggedIn") === "true") {
      setIsLoggedIn(true);
      loadStats();
    }
  }, []);

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
        loadStats();
      } else {
        setLoginError(true);
      }
    } catch (error) {
      console.error(error);
      setLoginError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminLoggedIn");
    setIsLoggedIn(false);
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_URL}?action=getDashboardStats`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("โหลดสถิติไม่สำเร็จ", error);
    }
  };

  // ================= ส่วนหน้าจอ Login =================
  if (!isLoggedIn) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)" }}>
        <div className="card border-0 rounded-4 shadow-lg" style={{ maxWidth: "400px", width: "100%" }}>
          <div className="card-body p-5">
            <div className="text-center mb-4">
              <i className="bi bi-shield-lock text-primary" style={{ fontSize: "3rem" }}></i>
              <h4 className="fw-bold mt-2">ระบบจัดการ อภ.1</h4>
            </div>
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label fw-bold">ชื่อผู้ใช้</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="form-control" required />
              </div>
              <div className="mb-4">
                <label className="form-label fw-bold">รหัสผ่าน</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-control" required />
              </div>
              {loginError && <div className="alert alert-danger py-2 text-center">รหัสผ่านไม่ถูกต้อง!</div>}
              <button type="submit" className="btn btn-primary w-100 fw-bold py-2" disabled={isLoading}>
                {isLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ================= ส่วนหน้าจอ Dashboard =================
  return (
    <div className="d-flex" style={{ minHeight: "100vh", backgroundColor: "#f4f7fc" }}>
      
      {/* แถบเมนูด้านซ้าย */}
      <nav className="sidebar">
        <div className="text-center pt-5 pb-3 border-bottom mb-4">
          <i className="bi bi-building-check text-primary" style={{ fontSize: "2.5rem" }}></i>
          <div className="fw-bold fs-5 text-dark mt-2">ระบบใบอนุญาต</div>
          <div className="small text-muted">กิจการที่เป็นอันตรายต่อสุขภาพ</div>
        </div>
        
        <div className="nav-item-menu"><a className="nav-link-menu active"><i className="bi bi-grid-1x2-fill"></i> แดชบอร์ด</a></div>
        <div className="nav-item-menu"><a className="nav-link-menu text-muted"><i className="bi bi-clock-history"></i> ประวัติคำขอ</a></div>
        <div className="nav-item-menu"><a className="nav-link-menu text-muted"><i className="bi bi-search"></i> ค้นหากิจการ/แผนที่</a></div>
        
        <div className="mt-auto p-3 text-center text-muted small border-top bg-light">
          เทศบาลตำบลหนองเต็ง
        </div>
      </nav>

      {/* พื้นที่เนื้อหาหลัก */}
      <div className="flex-grow-1 d-flex flex-column" style={{ width: "calc(100% - 260px)" }}>
        <header className="topbar">
          <h5 className="mb-0 fw-bold text-dark">ภาพรวมระบบ (Dashboard)</h5>
          <button className="btn btn-light btn-sm fw-bold text-danger rounded-pill px-3" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right"></i> ออกจากระบบ
          </button>
        </header>

        <div className="container-fluid p-4">
          {/* การ์ดแสดงสถิติ */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card stat-card h-100">
                <div className="card-body p-4 d-flex justify-content-between">
                  <div><h6 className="text-muted fw-bold">คำขอทั้งหมด</h6><h3 className="fw-bold text-primary mb-0">{stats.total}</h3></div>
                  <div className="icon-box bg-primary bg-opacity-10 text-primary"><i className="bi bi-files"></i></div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card stat-card h-100">
                <div className="card-body p-4 d-flex justify-content-between">
                  <div><h6 className="text-muted fw-bold">รอตรวจสอบ</h6><h3 className="fw-bold text-warning mb-0">{stats.pending}</h3></div>
                  <div className="icon-box bg-warning bg-opacity-10 text-warning"><i className="bi bi-hourglass-split"></i></div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card stat-card h-100">
                <div className="card-body p-4 d-flex justify-content-between">
                  <div><h6 className="text-muted fw-bold">อนุมัติแล้ว</h6><h3 className="fw-bold text-success mb-0">{stats.approved}</h3></div>
                  <div className="icon-box bg-success bg-opacity-10 text-success"><i className="bi bi-check-circle-fill"></i></div>
                </div>
              </div>
            </div>
          </div>

          {/* พื้นที่สำหรับใส่ตารางรายการคำขอในอนาคต */}
          <div className="card table-card">
            <div className="card-header bg-white p-4 border-bottom">
              <h5 className="mb-0 fw-bold"><i className="bi bi-list-task text-primary me-2"></i>รายการรอตรวจสอบ</h5>
            </div>
            <div className="card-body p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-3"></div>
              <div>เตรียมดึงข้อมูลตารางมาแสดงในขั้นตอนต่อไป...</div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}