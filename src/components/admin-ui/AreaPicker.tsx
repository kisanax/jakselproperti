"use client";

import { useEffect, useRef, useState } from "react";

export type AreaPickerArea = {
  id: number;
  name: string;
  slug: string;
  level: number;
  parentId: number | null;
};

export type AreaPickerSelection = {
  areaId: number | null;
  kecamatanId: number | null;
  area: AreaPickerArea | null;
};

type AreaPickerProps = {
  value?: number | string | null;
  onChange: (selection: AreaPickerSelection) => void;
  maxLevel?: 3 | 4;
  required?: boolean;
  disabled?: boolean;
  idPrefix?: string;
};

async function fetchAreas(url: string, signal?: AbortSignal): Promise<AreaPickerArea[]> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Gagal memuat data wilayah");
  const data = (await response.json()) as { areas: AreaPickerArea[] };
  return data.areas;
}

export function AreaPicker({
  value,
  onChange,
  maxLevel = 4,
  required = false,
  disabled = false,
  idPrefix = "area",
}: AreaPickerProps) {
  const [provinces, setProvinces] = useState<AreaPickerArea[]>([]);
  const [cities, setCities] = useState<AreaPickerArea[]>([]);
  const [districts, setDistricts] = useState<AreaPickerArea[]>([]);
  const [villages, setVillages] = useState<AreaPickerArea[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [villageId, setVillageId] = useState("");
  const [villageQuery, setVillageQuery] = useState("");
  const [villageOpen, setVillageOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resolvedValue = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchAreas("/api/areas?level=1", controller.signal)
      .then(setProvinces)
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === "AbortError")) setError("Gagal memuat provinsi");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const normalized = value === null || value === undefined || value === "" ? null : String(value);
    if (normalized === resolvedValue.current) return;
    resolvedValue.current = normalized;

    if (normalized === null) {
      const timeout = window.setTimeout(() => {
        setProvinceId("");
        setCityId("");
        setDistrictId("");
        setVillageId("");
        setVillageQuery("");
        setCities([]);
        setDistricts([]);
        setVillages([]);
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const controller = new AbortController();
    fetchAreas(`/api/areas?id=${encodeURIComponent(normalized)}`, controller.signal)
      .then(async (chain) => {
        const province = chain.find((area) => area.level === 1);
        const city = chain.find((area) => area.level === 2);
        const district = chain.find((area) => area.level === 3);
        const village = chain.find((area) => area.level === 4);
        setProvinceId(province ? String(province.id) : "");
        setCityId(city ? String(city.id) : "");
        setDistrictId(district ? String(district.id) : "");
        setVillageId(maxLevel === 4 && village ? String(village.id) : "");
        setVillageQuery(maxLevel === 4 && village ? village.name : "");

        const [nextCities, nextDistricts] = await Promise.all([
          province ? fetchAreas(`/api/areas?level=2&parentId=${province.id}`, controller.signal) : [],
          city ? fetchAreas(`/api/areas?level=3&parentId=${city.id}`, controller.signal) : [],
        ]);
        setCities(nextCities);
        setDistricts(nextDistricts);
        setVillages(village ? [village] : []);
      })
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === "AbortError")) setError("Gagal memuat hierarki wilayah");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [maxLevel, value]);

  useEffect(() => {
    if (maxLevel !== 4 || !districtId || villageId) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const q = villageQuery.trim();
      fetchAreas(
        `/api/areas?level=4&parentId=${districtId}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
        controller.signal
      )
        .then(setVillages)
        .catch((err: unknown) => {
          if (!(err instanceof DOMException && err.name === "AbortError")) setError("Gagal mencari kelurahan/desa");
        });
    }, 300);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [districtId, maxLevel, villageId, villageQuery]);

  const clearAfterProvince = (nextProvinceId: string) => {
    setProvinceId(nextProvinceId);
    setCityId("");
    setDistrictId("");
    setVillageId("");
    setVillageQuery("");
    setDistricts([]);
    setVillages([]);
    resolvedValue.current = null;
    onChange({ areaId: null, kecamatanId: null, area: null });
    if (!nextProvinceId) return setCities([]);
    setLoading(true);
    fetchAreas(`/api/areas?level=2&parentId=${nextProvinceId}`)
      .then(setCities)
      .catch(() => setError("Gagal memuat kabupaten/kota"))
      .finally(() => setLoading(false));
  };

  const clearAfterCity = (nextCityId: string) => {
    setCityId(nextCityId);
    setDistrictId("");
    setVillageId("");
    setVillageQuery("");
    setVillages([]);
    resolvedValue.current = null;
    onChange({ areaId: null, kecamatanId: null, area: null });
    if (!nextCityId) return setDistricts([]);
    setLoading(true);
    fetchAreas(`/api/areas?level=3&parentId=${nextCityId}`)
      .then(setDistricts)
      .catch(() => setError("Gagal memuat kecamatan"))
      .finally(() => setLoading(false));
  };

  const selectDistrict = (nextDistrictId: string) => {
    const district = districts.find((area) => String(area.id) === nextDistrictId) || null;
    setDistrictId(nextDistrictId);
    setVillageId("");
    setVillageQuery("");
    setVillages([]);
    resolvedValue.current = district ? String(district.id) : null;
    onChange({ areaId: district?.id ?? null, kecamatanId: district?.id ?? null, area: district });
  };

  const selectVillage = (village: AreaPickerArea) => {
    setVillageId(String(village.id));
    setVillageQuery(village.name);
    setVillageOpen(false);
    resolvedValue.current = String(village.id);
    onChange({ areaId: village.id, kecamatanId: Number(districtId), area: village });
  };

  return (
    <div className="ui-area-picker" aria-busy={loading}>
      <div className="ui-area-picker__grid">
        <label className="ui-field" htmlFor={`${idPrefix}-province`}>
          <span className="ui-field__label">Provinsi {required ? "*" : ""}</span>
          <select id={`${idPrefix}-province`} className="admin-input" value={provinceId} onChange={(event) => clearAfterProvince(event.target.value)} disabled={disabled} required={required}>
            <option value="">Pilih provinsi</option>
            {provinces.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
          </select>
        </label>
        <label className="ui-field" htmlFor={`${idPrefix}-city`}>
          <span className="ui-field__label">Kabupaten / Kota {required ? "*" : ""}</span>
          <select id={`${idPrefix}-city`} className="admin-input" value={cityId} onChange={(event) => clearAfterCity(event.target.value)} disabled={disabled || !provinceId} required={required}>
            <option value="">Pilih kabupaten/kota</option>
            {cities.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
          </select>
        </label>
        <label className="ui-field" htmlFor={`${idPrefix}-district`}>
          <span className="ui-field__label">Kecamatan {required ? "*" : ""}</span>
          <select id={`${idPrefix}-district`} className="admin-input" value={districtId} onChange={(event) => selectDistrict(event.target.value)} disabled={disabled || !cityId} required={required}>
            <option value="">Pilih kecamatan</option>
            {districts.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
          </select>
        </label>
        {maxLevel === 4 && (
          <div className="ui-field ui-area-picker__autocomplete">
            <label className="ui-field__label" htmlFor={`${idPrefix}-village`}>Kelurahan / Desa (opsional)</label>
            <input
              id={`${idPrefix}-village`}
              className="admin-input"
              value={villageQuery}
              placeholder={districtId ? "Cari kelurahan/desa" : "Pilih kecamatan dahulu"}
              disabled={disabled || !districtId}
              autoComplete="off"
              onFocus={() => setVillageOpen(true)}
              onBlur={() => window.setTimeout(() => setVillageOpen(false), 150)}
              onChange={(event) => {
                setVillageId("");
                setVillageQuery(event.target.value);
                setVillageOpen(true);
                const district = districts.find((area) => String(area.id) === districtId) || null;
                resolvedValue.current = district ? String(district.id) : null;
                onChange({ areaId: district?.id ?? null, kecamatanId: district?.id ?? null, area: district });
              }}
            />
            {villageOpen && districts.length > 0 && (
              <div className="ui-area-picker__options">
                {villages.length === 0 ? (
                  <div className="ui-area-picker__empty">Kelurahan/desa tidak ditemukan</div>
                ) : villages.map((area) => (
                  <button key={area.id} type="button" className="ui-area-picker__option" onMouseDown={(event) => { event.preventDefault(); selectVillage(area); }}>
                    {area.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {error && <div className="ui-field__help ui-area-picker__error">{error}</div>}
    </div>
  );
}
