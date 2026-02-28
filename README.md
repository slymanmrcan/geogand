# Geogand

Acik kaynak, tarayicida calisan bir harita tahmin oyunu.
Google Street View panoramasi uzerinden nerede oldugunu tahmin edersin.

Bu proje, "hizli ve sade bir GeoGuessr alternatifi" mantigiyla yazildi.

## Ozellikler

- Zorluk secimi: `Kolay`, `Orta`, `Zor`
- Tur sayisi secimi: `1 / 3 / 5 / 10`
- Tur suresi secimi: `Preset`, `Suresiz`, `30 / 60 / 90 / 120 sn`
- Tur icinde manuel `YENILE` (konumu degistir)
- Oyun sonu kullanim ozeti:
  - Metadata denemesi
  - Pano yukleme
  - Maps JS yukleme
  - OSM tile istatistikleri
  - Tahmini maliyet (bilgilendirme amacli)

## Kullandigi API'ler

Bu uygulama Google tarafinda su API'leri kullanir:

- `Maps JavaScript API`
- `Street View Static API` (metadata endpoint)

Not: Harita kutucuklari (tile) OpenStreetMap/Leaflet tarafindan yuklenir, Google kotasina yazilmaz.

## Hizli Baslangic

Bu proje build sistemi istemez, statik dosya olarak calisir.

1. Repo'yu indir.
2. Proje klasorunde basit bir HTTP sunucu ac.
3. Tarayicidan ac.
4. Splash ekranda API key girip oyunu baslat.

Ornek yerel sunucu:

```bash
python3 -m http.server 5500
```

Sonra:

```text
http://localhost:5500
```

## Statik Yayinlama

Bu proje tamamen statik oldugu icin herhangi bir CI/CD workflow zorunlu degildir.

Asagidaki ortamlarda dogrudan yayinlayabilirsin:

- Nginx
- GitHub Pages
- Netlify / Vercel (static)

## Google Maps API Key nasil alinir?

1. [Google Cloud Console](https://console.cloud.google.com/) ac.
2. Yeni bir proje olustur (veya var olani sec).
3. `APIs & Services > Library` ekranindan su API'leri etkinlestir:
   - `Maps JavaScript API`
   - `Street View Static API`
4. `APIs & Services > Credentials > Create credentials > API key` ile key olustur.
5. (Onerilir) Key kisitlari uygula:
   - `Application restrictions`: `HTTP referrers (web sites)`
   - `API restrictions`: Sadece yukaridaki iki API'yi acik birak.
   - Referrer listesine deploy domainini ekle:
     - `http://localhost:*/*`
     - `https://<kullanici-adi>.github.io/*`

## Kota ve Usage nereden bakilir?

Google Cloud tarafinda 3 farkli ekran kullan:

1. `APIs & Services > Dashboard`
   - Istek, hata orani, gecikme gibi teknik metrikler
2. `APIs & Services > Quotas`
   - Gunluk/dakikalik limitler ve "current usage"
3. `Billing > Reports`
   - Gercek maliyet (kesin kaynak burasi)

Not:

- `Current usage` anlik kullanimi gosterir.
- `Current usage percentage` limite gore yuzdedir.
- Kesin ucret bilgisi quota ekraninda degil, billing ekranindadir.

## "Local calisiyor ama GitHub'da calismiyor" durumu

Bu durum cogu zaman CORS degil, API key referrer kisiti problemidir.

Kontrol listesi:

1. `Maps JavaScript API` etkin mi?
2. `Street View Static API` etkin mi?
3. API key sadece dogru domainlere mi acik?
4. Referrer kisitinda `https://<kullanici-adi>.github.io/*` var mi?
5. Billing aktif mi?

## Guvenlik Notu

Bu proje API key'i tarayicida kullanir ve `localStorage`'da saklar.
Bu nedenle:

- Sadece gerekli API'lere izin ver.
- Referrer kisiti mutlaka kullan.
- Uretim ortaminda key'i acik/genis yetkili birakma.

## Maliyet Hakkinda

Oyun icindeki "Tahmini maliyet" sadece yaklasik bir gostergedir.
Google tarafindaki gercek faturalama rakami farkli olabilir.
Kesin tutar icin her zaman `Google Cloud Billing` verisini esas al.

## Teknoloji

- Vanilla JavaScript
- Leaflet
- Google Maps JavaScript API
- Street View Metadata (Static API endpoint)

## Katki

PR ve issue acabilirsin. Ozellikle su alanlarda katkilar degerli:

- Performans ve UX iyilestirmeleri
- Daha iyi skorlama/oyun modlari
- Telemetri ve kullanim raporlari
- Dokumantasyon

## Lisans

Bu proje `MIT` lisansi ile dagitilir.
Detaylar icin [LICENSE](LICENSE) dosyasina bak.
