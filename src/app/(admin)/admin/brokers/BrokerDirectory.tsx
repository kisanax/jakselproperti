"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, UserRound } from "lucide-react";
import { ButtonLink, RecordHeader, RecordPage, StatusBadge, type StatusTone } from "@/components/admin-ui";
import type { BrokerType, BrokerVerificationStatus } from "@prisma/client";
import styles from "./brokers.module.css";

export type BrokerDirectoryItem = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isActive: boolean;
  createdAt: string;
  brokerType: BrokerType | null;
  verificationStatus: BrokerVerificationStatus;
  phone: string | null;
  city: string | null;
  province: string | null;
  listingCount: number;
};

const statusLabel: Record<BrokerVerificationStatus, string> = {
  PROFILE_INCOMPLETE: "Profil belum lengkap",
  PENDING_REVIEW: "Menunggu review",
  REVISION_REQUIRED: "Perlu revisi",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
  SUSPENDED: "Ditangguhkan",
};

const statusTone: Record<BrokerVerificationStatus, StatusTone> = {
  PROFILE_INCOMPLETE: "neutral",
  PENDING_REVIEW: "warning",
  REVISION_REQUIRED: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

const typeLabel: Record<BrokerType, string> = {
  INDEPENDENT: "Independen",
  AGENCY_OWNER: "Pemilik agency",
  AGENCY_MEMBER: "Anggota agency",
};

function initials(name: string | null, email: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "B";
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function BrokerDirectory({ brokers }: { brokers: BrokerDirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("id-ID");
    return brokers.filter((broker) => {
      const matchesQuery = !normalized || [broker.name, broker.email, broker.city, broker.province, broker.phone]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("id-ID").includes(normalized));
      return matchesQuery && (status === "ALL" || broker.verificationStatus === status);
    });
  }, [brokers, query, status]);

  const pendingCount = brokers.filter((broker) => broker.verificationStatus === "PENDING_REVIEW").length;
  const verifiedCount = brokers.filter((broker) => broker.verificationStatus === "VERIFIED").length;

  return (
    <RecordPage>
      <RecordHeader
        eyebrow="Platform operations"
        title="Broker"
        subtitle={`${brokers.length} akun broker · data database`}
        actions={<ButtonLink href="/admin/brokers/new"><Plus size={17} /> Buat akun broker</ButtonLink>}
      />

      <section className={styles.summary} aria-label="Ringkasan broker">
        <div><strong>{brokers.length}</strong><span>Total broker</span></div>
        <div><strong>{pendingCount}</strong><span>Menunggu review</span></div>
        <div><strong>{verifiedCount}</strong><span>Terverifikasi</span></div>
      </section>

      <section className={styles.toolbar} aria-label="Cari dan filter broker">
        <label className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Cari broker</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, email, kota, atau WhatsApp…" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter status broker">
          <option value="ALL">Semua status</option>
          {Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </section>

      {filtered.length ? (
        <div className={styles.directory}>
          <div className={styles.tableHeader} aria-hidden="true">
            <span>Broker</span><span>Jenis</span><span>Wilayah</span><span>Status</span><span>Listing</span>
          </div>
          {filtered.map((broker) => (
            <Link href={`/admin/brokers/${broker.id}`} className={styles.row} key={broker.id}>
              <span className={styles.identity}>
                <span className={styles.logo}>{initials(broker.name, broker.email)}</span>
                <span><strong>{broker.name || "Tanpa nama"}</strong><small>{broker.email || "Email belum tersedia"}</small></span>
              </span>
              <span className={styles.stack}><strong>{broker.brokerType ? typeLabel[broker.brokerType] : "Belum dipilih"}</strong><small>{broker.phone || "WhatsApp belum diisi"}</small></span>
              <span className={styles.principal}>{[broker.city, broker.province].filter(Boolean).join(", ") || "Wilayah belum diisi"}</span>
              <span><StatusBadge tone={!broker.isActive ? "neutral" : statusTone[broker.verificationStatus]}>{!broker.isActive ? "Akun nonaktif" : statusLabel[broker.verificationStatus]}</StatusBadge></span>
              <span className={styles.metrics}><strong>{broker.listingCount}</strong> listing<small>Terdaftar {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(broker.createdAt))}</small></span>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <UserRound size={30} />
          <strong>Broker tidak ditemukan</strong>
          <span>Ubah kata pencarian atau filter status.</span>
        </div>
      )}
    </RecordPage>
  );
}
