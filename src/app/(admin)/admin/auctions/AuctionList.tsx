"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gavel, Plus, Search } from "lucide-react";
import { categories, auctionStatuses, effectiveStatus } from "@/lib/auctions";
import type { AuctionView } from "@/lib/auction-records";
import "./auctions.css";
export default function AuctionList({records}:{records:AuctionView[]}) {
  const router=useRouter(); const [search,setSearch]=useState(""); const [filter,setFilter]=useState(""); const [category,setCategory]=useState("");
  // Refresh long-lived operator tabs so expiry is reflected without a cron worker.
  useEffect(()=>{const id=setInterval(()=>router.refresh(),60000);return()=>clearInterval(id);},[router]);
  const rows=records.filter(r=>(!filter || effectiveStatus(r)===filter) && (!category || r.category===category) && [r.title,r.city,r.address,r.seller,r.contactName].join(" ").toLowerCase().includes(search.toLowerCase()));
  const expired=records.filter(r=>effectiveStatus(r)==="EXPIRED").length;
  return <div className="auction-module">
    <div className="admin-page-header"><div><h1><Gavel size={24}/> Rumah Sitaan & Lelang</h1><p>Database internal Jabodetabek · {records.length} catatan</p></div><Link className="admin-btn admin-btn-primary" href="/admin/auctions/new"><Plus size={18}/> Tambah / Smart Paste WA</Link></div>
    {expired>0 && <button className="auction-notice" onClick={()=>setFilter("EXPIRED")}>{expired} listing kedaluwarsa perlu ditinjau →</button>}
    <div className="admin-card auction-filters"><label><span><Search size={14}/> Cari properti</span><input className="admin-input" placeholder="Judul, kota, bank, perantara…" value={search} onChange={e=>setSearch(e.target.value)}/></label><label><span>Kategori</span><select className="admin-input" value={category} onChange={e=>setCategory(e.target.value)}><option value="">Semua kategori</option>{Object.entries(categories).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Status</span><select className="admin-input" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Semua status</option><option value="SCHEDULED">Terjadwal</option>{Object.entries(auctionStatuses).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div>
    <div className="admin-card-grid">{rows.map(r=><Link href={`/admin/auctions/${r.id}`} key={r.id} className="admin-card auction-card">
      {r.photos[0] && <img src={r.photos[0]} alt={r.title} className="auction-cover"/>}
      <div className="auction-badges"><span className="admin-badge admin-badge-pending">{categories[r.category]}</span><span className="admin-badge">{effectiveStatus(r)==="SCHEDULED"?"Terjadwal":auctionStatuses[effectiveStatus(r) as keyof typeof auctionStatuses]}</span></div>
      <h2>{r.title}</h2><p>{[r.district,r.city].filter(Boolean).join(", ")||"Lokasi belum diisi"}</p>
      <strong>{r.limitPrice ? `Nilai limit / harga: Rp ${Number(r.limitPrice).toLocaleString("id-ID")}` : "Harga belum tersedia"}</strong>
      <p>Jaminan: {r.depositAmount?`Rp ${Number(r.depositAmount).toLocaleString("id-ID")}`:"Belum diisi"}</p>
      <p>Masa aktif: {r.activeFrom||"—"} s.d. {r.activeUntil||"—"}</p><small>{r.organizer||r.seller||"Penyelenggara belum diisi"}</small>
    </Link>)}</div>
    {!rows.length && <div className="admin-card admin-empty"><Gavel size={32}/><h2>{records.length?"Tidak ada hasil yang cocok":"Belum ada data sitaan atau lelang"}</h2><p>Tambahkan manual atau tempel satu pesan WhatsApp untuk ditinjau.</p></div>}
  </div>;
}
