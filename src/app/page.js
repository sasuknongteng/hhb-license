"use client";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 🔴 นำ URL ของ Web App ที่ก๊อปปี้มา วางแทนที่ข้อความด้านล่างนี้ 🔴
  const API_URL = "https://script.google.com/macros/s/AKfycbzQO_vdqxqgZBg3ok8KmZ3ETLbFeTY2VAhnEjJH5eee5evZ8lYXY8fVmqenFJPwQ74E/exec";

  const handleSearch = async () => {
    if (!keyword.trim()) {
      alert("กรุณากรอก ชื่อผู้ขอ, ชื่อกิจการ หรือ เลขที่ใบอนุญาต ที่ต้องการค้นหา");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setResults([]); // ล้างผลลัพธ์เก่าออกก่อน

    try {
      // ยิงคำสั่งไปหา Google Apps Script API
      const res = await fetch(`${API_URL}?action=searchLicenseStatus&keyword=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับฐานข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <>
      <nav className="navbar-custom d-flex justify-content-between align-items-center px-4">
        <div className="d-flex align-items-center">
          <i className="bi bi-shield-check text-primary fs-3 me-2"></i>
          <span className="fw-bold fs-5 text-dark">ระบบ อภ.1</span>
        </div>
        {/* ใช้ Link ของ Next.js เพื่อเตรียมส่งไปหน้าแอดมิน */}
        <Link href="/admin" className="staff-link">
          <i className="bi bi-person-lock me-1"></i> สำหรับเจ้าหน้าที่
        </Link>
      </nav>

      <div className="hero-section">
        <i className="bi bi-search mb-3 d-block" style={{ fontSize: "3rem", opacity: 0.9 }}></i>
        <h2 className="fw-bold mb-3">ตรวจสอบสถานะคำขอ / ใบอนุญาต</h2>
        <p className="mb-4" style={{ opacity: 0.8, fontWeight: 300 }}>
          เทศบาลตำบลหนองเต็ง อำเภอกระสัง จังหวัดบุรีรัมย์
        </p>

        <div className="search-box">
          <input
            type="text"
            className="search-input"
            placeholder="พิมพ์ชื่อผู้ขอ, ชื่อกิจการ หรือ เลขที่ใบอนุญาต..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button className="btn btn-primary search-btn" onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <><span className="spinner-border spinner-border-sm me-1"></span> กำลังหา...</>
            ) : (
              <>ค้นหา <i className="bi bi-arrow-right ms-1"></i></>
            )}
          </button>
        </div>
      </div>

      <div className="result-container">
        {!hasSearched && (
          <div className="text-center mt-5 text-muted">
            <i className="bi bi-file-earmark-text mb-3 d-block" style={{ fontSize: "4rem", opacity: 0.3 }}></i>
            <h5>กรุณากรอกข้อมูลเพื่อค้นหาสถานะ</h5>
          </div>
        )}

        {hasSearched && isLoading && (
          <div className="text-center mt-5">
            <div className="spinner-grow text-primary" style={{ width: "3rem", height: "3rem" }} role="status"></div>
            <h5 className="mt-3 text-muted">กำลังค้นหาข้อมูล &quot;{keyword}&quot; ...</h5>
          </div>
        )}

        {hasSearched && !isLoading && results.length === 0 && (
          <div className="text-center mt-5">
            <i className="bi bi-search text-danger mb-3 d-block" style={{ fontSize: "4rem", opacity: 0.5 }}></i>
            <h4 className="text-dark">ไม่พบข้อมูล!</h4>
            <p className="text-muted">
              ไม่พบข้อมูลที่ตรงกับคำว่า <strong>"{keyword}"</strong>
              <br />
              กรุณาตรวจสอบการสะกดคำและลองใหม่อีกครั้ง
            </p>
          </div>
        )}

        {hasSearched && !isLoading && results.length > 0 && (
          <>
            <div className="mb-3 text-white ps-2" style={{ textShadow: "0px 1px 3px rgba(0,0,0,0.3)", fontSize: "0.95rem" }}>
              <i className="bi bi-info-circle me-1"></i>พบข้อมูลทั้งหมด <strong>{results.length}</strong> รายการ
            </div>
            
            {/* นำข้อมูลที่ได้มาวนลูป (Loop) สร้างการ์ดแสดงผล */}
            {results.map((item, index) => {
              const isApproved = item.status === "ตรวจสอบแล้ว" || item.status === "อนุมัติ";
              const badgeClass = isApproved ? "status-approved" : "status-pending";
              const badgeIcon = isApproved ? "bi-check-circle-fill" : "bi-hourglass-split";
              const displayStatus = isApproved ? "อนุมัติ / ออกใบอนุญาตแล้ว" : "รอตรวจสอบเอกสาร";
              
              return (
                <div className="result-card" key={index}>
                  <div className="card-header-custom">
                    <span className="text-muted small">
                      <i className="bi bi-calendar-event me-1"></i>วันที่ยื่นคำขอ: {item.reqDate.split(' ')[0]}
                    </span>
                    <span className={`status-badge ${badgeClass}`}>
                      <i className={`bi ${badgeIcon} me-1`}></i>{displayStatus}
                    </span>
                  </div>
                  <div className="card-body p-4">
                    <div className="row g-3">
                      <div className="col-md-5">
                        <div className="info-label">ชื่อผู้ขออนุญาต</div>
                        <div className="info-value">
                          <i className="bi bi-person me-2 text-primary"></i>{item.applicantName}
                        </div>
                      </div>
                      <div className="col-md-7">
                        <div className="info-label">ชื่อสถานประกอบการ</div>
                        <div className="info-value">
                          <i className="bi bi-shop me-2 text-primary"></i>{item.businessName}
                        </div>
                      </div>
                    </div>

                    <hr className="text-black-50 my-3" />

                    <div className="row g-3 bg-light p-3 rounded-4">
                      <div className="col-md-4 col-sm-6">
                        <div className="info-label">เลขที่รับเรื่อง / ใบอนุญาต</div>
                        <div className="info-value fw-bold">
                          {isApproved && item.licenseNo !== "-" ? (
                            <span className="text-primary fs-5">{item.licenseNo}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </div>
                      </div>
                      <div className="col-md-4 col-sm-6">
                        <div className="info-label">วันที่อนุมัติล่าสุด</div>
                        <div className="info-value text-success fw-bold">
                          {isApproved ? item.approveDate : "-"}
                        </div>
                      </div>
                      <div className="col-md-4 col-sm-12">
                        <div className="info-label text-danger">
                          <i className="bi bi-calendar-x me-1"></i>วันที่หมดอายุ
                        </div>
                        <div className="info-value text-danger fw-bold">
                          {isApproved ? item.expireDate : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="footer">
        &copy; 2026 กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลหนองเต็ง
      </div>
    </>
  );
}