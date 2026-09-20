"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Plus, Search } from "lucide-react";
import { ButtonLink, RecordHeader, RecordPage, StatusBadge, type StatusTone } from "@/components/admin-ui";
import type { BrokerOrganization, OrganizationStatus } from "@/modules/organizations/types";
import styles from "./brokers.module.css";

const statusLabel: Record<OrganizationStatus, string> = {
  VERIFIED: "Terverifikasi",
  PENDING: "Perlu verifikasi",
  SUSPENDED: "Ditangguhkan",
  ARCHIVED: "Diarsipkan",
};

const statusTone: Record<OrganizationStatus, StatusTone> = {
  VERIFIED: "success",
  PENDING: "warning",
  SUSPENDED: "danger",
  ARCHIVED: "neutral",
};

export default function BrokerDirectory({ organizations }: { organizations: BrokerOrganization[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("id-ID");
    return organizations.filter((organization) => {
      const matchesQuery = !normalized || [organization.name, organization.legalName, organization.city, organization.principalName]
        .some((value) => value.toLocaleLowerCase("id-ID").includes(normalized));
      return matchesQuery && (status === "ALL" || organization.status === status);
    });
  }, [organizations, query, status]);

  return (
    <RecordPage>
      <RecordHeader
        eyebrow="Platform operations"
        title="Broker & Cabang"
        subtitle={`${organizations.length} organisasi · data prototype`}
        actions={<ButtonLink href="/admin/brokers/new"><Plus size={17} /> Tambah broker</ButtonLink>}
      />

      <section className={styles.summary} aria-label="Ringkasan broker">
        <div><strong>{organizations.length}</strong><span>Organisasi</span></div>
        <div><strong>{organizations.reduce((total, item) => total + item.branches.length, 0)}</strong><span>Cabang</span></div>
        <div><strong>{organizations.reduce((total, item) => total + item.memberCount, 0)}</strong><span>Anggota</span></div>
      </section>

      <section className={styles.toolbar} aria-label="Cari dan filter broker">
        <label className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Cari broker</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari broker, kota, atau principal…" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter status broker">
          <option value="ALL">Semua status</option>
          {Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </section>

      {filtered.length ? (
        <div className={styles.directory}>
          <div className={styles.tableHeader} aria-hidden="true">
            <span>Broker</span><span>Kantor pusat</span><span>Principal</span><span>Status</span><span>Performa</span>
          </div>
          {filtered.map((organization) => (
            <Link href={`/admin/brokers/${organization.id}`} className={styles.row} key={organization.id}>
              <span className={styles.identity}>
                <span className={styles.logo}>{organization.initials}</span>
                <span><strong>{organization.name}</strong><small>{organization.code} · {organization.branches.length} cabang</small></span>
              </span>
              <span className={styles.stack}><strong>{organization.city}</strong><small>{organization.province}</small></span>
              <span className={styles.principal}>{organization.principalName}</span>
              <span><StatusBadge tone={statusTone[organization.status]}>{statusLabel[organization.status]}</StatusBadge></span>
              <span className={styles.metrics}><strong>{organization.listingCount}</strong> listing<small>{organization.memberCount} anggota · {organization.activeLeadCount} leads</small></span>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <Building2 size={30} />
          <strong>Broker tidak ditemukan</strong>
          <span>Ubah kata pencarian atau filter status.</span>
        </div>
      )}
    </RecordPage>
  );
}
