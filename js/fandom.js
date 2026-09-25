/**
 * ==============================================================================
 * MINIFAL FANDOM & WIKI - ARAYÜZ VE İNTERAKTİF MANTIK
 * ==============================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Durum (State)
    const state = {
        activeCategory: "all",
        searchQuery: "",
        sortBy: "featured",
        selectedChartItem: "wep-03", // Başlangıçta Fırtına Hücum Tüfeği seçili
        activeModalItem: null
    };

    // URL parametresinden kategori seçimi (örn: ?cat=weapons veya ?cat=sports)
    if (typeof window !== "undefined" && window.location) {
        const urlParams = new URLSearchParams(window.location.search);
        const catParam = urlParams.get("cat");
        if (catParam) {
            state.activeCategory = catParam;
        }
    }

    // DOM Elemanları
    const itemsGrid = document.getElementById("items-grid");
    const searchInput = document.getElementById("search-input");
    const sortSelect = document.getElementById("sort-select");
    const categoryNav = document.getElementById("category-nav");
    const resultsCount = document.getElementById("results-count");
    const modalOverlay = document.getElementById("item-modal");
    const modalContent = document.getElementById("modal-content-body");
    const modalCloseBtn = document.getElementById("modal-close-btn");
    const chartSelect = document.getElementById("chart-item-select");
    const chartSvg = document.getElementById("price-chart-svg");
    const chartTooltip = document.getElementById("chart-tooltip");
    const marketTableBody = document.getElementById("market-table-body");

    // Tüm eşyaları düz bir diziye topla
    function getAllItems() {
        const list = [
            ...MINIFAL_DATABASE.weapons,
            ...MINIFAL_DATABASE.modkits,
            ...MINIFAL_DATABASE.armor,
            ...(MINIFAL_DATABASE.sports || []),
            ...(MINIFAL_DATABASE.pets || []),
            ...(MINIFAL_DATABASE.petfood || []),
            ...(MINIFAL_DATABASE.vouchers || []),
            ...(MINIFAL_DATABASE.toys || []),
            ...MINIFAL_DATABASE.masks,
            ...MINIFAL_DATABASE.furniture,
            ...MINIFAL_DATABASE.potions
        ];
        return list;
    }

    // Kategoriye ve filtreye göre eşyaları getir
    function getFilteredItems() {
        let items = getAllItems();

        // Kategori filtresi
        if (state.activeCategory !== "all") {
            items = items.filter(item => item.category === state.activeCategory);
        }

        // Arama filtresi
        if (state.searchQuery.trim()) {
            const query = state.searchQuery.toLowerCase();
            items = items.filter(item =>
                item.name.toLowerCase().includes(query) ||
                (item.description && item.description.toLowerCase().includes(query)) ||
                (item.subType && item.subType.toLowerCase().includes(query)) ||
                (item.rarityName && item.rarityName.toLowerCase().includes(query))
            );
        }

        // Sıralama
        if (state.sortBy === "price-asc") {
            items.sort((a, b) => a.price - b.price);
        } else if (state.sortBy === "price-desc") {
            items.sort((a, b) => b.price - a.price);
        } else if (state.sortBy === "name-asc") {
            items.sort((a, b) => a.name.localeCompare(b.name, "tr"));
        } else if (state.sortBy === "change-desc") {
            items.sort((a, b) => (b.change24h || 0) - (a.change24h || 0));
        }

        return items;
    }

    // Eşya kartı ikonu belirleme (Gerçek görsel varsa görseli bas)
    function getItemIcon(item) {
        if (item.image) {
            return `<img src="${item.image}" alt="${item.name}" class="item-real-img" loading="lazy">`;
        }
        switch (item.category) {
            case "weapons": return "🔫";
            case "modkits": return "⚙️";
            case "armor": return "🛡️";
            case "sports": return "🎾";
            case "pets": return "🐾";
            case "petfood": return "🥕";
            case "vouchers": return "🎫";
            case "toys": return "🎪";
            case "masks": return item.subType === "Maske" ? "🎭" : item.subType === "Ceket" ? "🧥" : "👟";
            case "furniture": return item.subType === "Ev Planı" ? "📜" : "🛋️";
            case "potions": return "🧪";
            default: return "📦";
        }
    }

    // Fiyat ve Para Birimi Formatlayıcı (Cash & Crystal)
    function renderPriceHtml(item, isLarge = false) {
        const isCrystal = item.currency === "crystal";
        const iconSrc = isCrystal ? "./img/crystal_gem_trans.png" : "./img/cash_coin_trans.png";
        const label = isCrystal ? "Crystal" : "Cash";
        const iconStyle = isLarge ? "width:20px; height:15px;" : "width:17px; height:13px;";
        return `<span class="curr-badge ${isCrystal ? 'curr-badge--crystal' : ''}">
            <img src="${iconSrc}" class="curr-icon" style="${iconStyle}" alt="${label}">
            ${item.price.toLocaleString('tr-TR')}
            <small>${label}</small>
        </span>`;
    }

    // Kartları Render Et
    function renderCards() {
        if (!itemsGrid) return;
        const items = getFilteredItems();
        if (resultsCount) {
            resultsCount.textContent = `${items.length} eşya listeleniyor`;
        }

        if (items.length === 0) {
            itemsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 48px 20px; text-align: center; background: var(--sand); border: var(--edge); border-radius: var(--radius-lg); box-shadow: var(--lift-1);">
                    <p style="font-size: 32px; margin-bottom: 8px;">🔍</p>
                    <h3 style="font-family: var(--font-display); font-size: 20px; margin: 0 0 8px;">Sonuç Bulunamadı</h3>
                    <p style="color: var(--ink-dim); margin: 0;">"${state.searchQuery}" ile eşleşen bir eşya bulunamadı. Lütfen arama kriterlerinizi kontrol edin.</p>
                </div>
            `;
            return;
        }

        itemsGrid.innerHTML = items.map(item => {
            const icon = getItemIcon(item);
            const rarityClass = `rarity-${item.rarity || 'common'}`;

            // Mini stat barları
            let statBarsHtml = '';
            if (item.stats) {
                statBarsHtml = `
                    <div class="item-stat-bars">
                        <div class="stat-row">
                            <span>Hasar</span>
                            <div class="stat-bar-track"><div class="stat-bar-fill" style="width: ${item.stats.damage}%;"></div></div>
                        </div>
                        <div class="stat-row">
                            <span>Hız</span>
                            <div class="stat-bar-track"><div class="stat-bar-fill" style="width: ${item.stats.fireRate}%; background: var(--teal);"></div></div>
                        </div>
                    </div>
                `;
            } else if (item.slotCost !== undefined) {
                statBarsHtml = `
                    <div class="item-stat-bars">
                        <div class="stat-row">
                            <span>Slot Bedeli</span>
                            <span style="color: var(--teal);">${item.slotCost === 0 ? 'Bedelsiz (Sökücü)' : item.slotCost + ' Yuva'}</span>
                        </div>
                    </div>
                `;
            } else if (item.defense) {
                statBarsHtml = `
                    <div class="item-stat-bars">
                        <div class="stat-row">
                            <span>Zırh Koruması</span>
                            <div class="stat-bar-track"><div class="stat-bar-fill" style="width: ${Math.min(100, item.defense)}%; background: var(--gold);"></div></div>
                        </div>
                    </div>
                `;
            }

            return `
                <article class="item-card" data-id="${item.id}">
                    <div class="item-card-header">
                        <div class="item-icon-box">${icon}</div>
                        <span class="rarity-pill ${rarityClass}">${item.rarityName || 'Standart'}</span>
                    </div>
                    <h3 class="item-card-title">${item.name}</h3>
                    <p class="item-card-desc">${item.description || ''}</p>
                    ${statBarsHtml}
                    <div class="item-card-footer">
                        <div class="price-display">
                            <span class="price-label">Fiyat</span>
                            <span class="price-amount">${renderPriceHtml(item)}</span>
                        </div>
                        <button class="details-btn" type="button">Detaylar</button>
                    </div>
                </article>
            `;
        }).join('');

        // Kart tıklama dinleyicileri
        document.querySelectorAll(".item-card").forEach(card => {
            card.addEventListener("click", () => {
                const id = card.getAttribute("data-id");
                openItemModal(id);
            });
        });
    }

    // Modal açma
    // Modal açma (Bire Bir Minifal Oyun İçi "EŞYA AYRINTILARI" Düzeni)
    function openItemModal(itemId) {
        const item = getAllItems().find(i => i.id === itemId);
        if (!item) return;

        state.activeModalItem = item;

        // Fiyat ve Para Birimi
        const isCrystal = item.currency === "crystal";
        const coinIconSrc = isCrystal ? "./img/crystal_gem_trans.png" : "./img/cash_coin_trans.png";
        const currencyName = isCrystal ? "Crystal" : "Cash";
        const formattedPrice = item.price ? item.price.toLocaleString("tr-TR") : "0";
        const priceLabel = item.priceLabel || "Fiyatı";

        // Eşya Türü
        const itemType = item.inGameType || (item.category === "armor" ? "Paintball Zırhı" : (item.category === "weapons" ? "Paintball Gereci" : (item.category === "modkits" ? "Paintball Mod Kiti" : "Paintball Eşyası")));

        // Satıcı veya Bonus Satırı
        let metaHtml = '';
        if (item.seller) {
            metaHtml = `<div class="game-item-meta">Satıcı: ${item.seller}</div>`;
        }
        if (item.bonusText) {
            metaHtml += `<div class="game-item-meta" style="${item.seller ? 'margin-top:4px;' : ''}">${item.bonusText}</div>`;
        } else if (item.isShield && item.description) {
            metaHtml += `<div class="game-item-meta" style="margin-top:10px; max-width: 320px; line-height: 1.35;">${item.description}</div>`;
        } else if (item.category === "potions" && item.description) {
            metaHtml += `<div class="game-item-meta" style="margin-top:8px; line-height: 1.4; color: #3a3224; max-width: 330px;">${item.description}</div>`;
        } else if (!item.seller && item.description && item.category !== "weapons" && item.inGameType !== "Paintball Gereci") {
            metaHtml += `<div class="game-item-meta">${item.description}</div>`;
        }

        // İstatistikler (Kalkanlar veya Silahlar / Paintball Gereci)
        let statsHtml = '';
        if (item.isShield) {
            const blockFill = item.blockAngle !== undefined ? item.blockAngle : 33;
            statsHtml = `
                <div class="game-stats-container">
                    <!-- Sol Kolon: Bloke Açısı ve 2 Boş Bar -->
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <div class="game-stat-item">
                            <span class="game-stat-name" style="width:72px;">Bloke Açısı</span>
                            <div class="game-stat-bar-trough">
                                <div class="game-stat-bar-fill" style="width: ${blockFill}%;"></div>
                            </div>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-name" style="width:72px; visibility:hidden;">Bloke Açısı</span>
                            <div class="game-stat-bar-trough"></div>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-name" style="width:72px; visibility:hidden;">Bloke Açısı</span>
                            <div class="game-stat-bar-trough"></div>
                        </div>
                    </div>

                    <!-- Sağ Kolon: 3 Boş Bar (Oyun İçi Sabit Grid Düzeni) -->
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <div class="game-stat-item">
                            <span class="game-stat-name" style="visibility:hidden;">İsabet</span>
                            <div class="game-stat-bar-trough"></div>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-name" style="visibility:hidden;">İsabet</span>
                            <div class="game-stat-bar-trough"></div>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-name" style="visibility:hidden;">İsabet</span>
                            <div class="game-stat-bar-trough"></div>
                        </div>
                    </div>
                </div>
            `;
        } else if (item.category === "weapons" || item.inGameType === "Paintball Gereci" || item.stats) {
            // 6 temel oyun içi stat (Hasar, Atış Hızı, Cephane, Hız, İsabet, Dürbün)
            const dmg = item.stats?.damage !== undefined ? item.stats.damage : 50;
            const rate = item.stats?.fireRate !== undefined ? item.stats.fireRate : 50;
            const ammo = item.stats?.ammo !== undefined ? item.stats.ammo : Math.min(100, Math.round(((item.stats?.capacity || 30) / 100) * 100));
            const speed = item.stats?.speed !== undefined ? item.stats.speed : Math.max(20, Math.min(100, 100 - Math.round(dmg * 0.25)));
            const acc = item.stats?.accuracy !== undefined ? item.stats.accuracy : (item.stats?.range || 80);
            const scope = item.stats?.scope !== undefined ? item.stats.scope : (item.name.toLowerCase().includes("sniper") || item.name.toLowerCase().includes("scoped") ? 100 : 0);

            // Modkit Yuvaları (Eklentiler) - Sadece yuvası olan silahlarda gösterilir
            const slotsCount = item.modkitSlots !== undefined ? item.modkitSlots : 2;
            const equipped = item.equippedModkits || [];
            let eklentilerRowHtml = '';
            if (slotsCount > 0) {
                let slotsHtml = '';
                for (let i = 0; i < slotsCount; i++) {
                    if (equipped[i]) {
                        slotsHtml += `<div class="game-slot-cell is-equipped" data-slot="${i}" title="Takılı Modkit: ${item.name} Güçlendirici"><img src="${equipped[i]}" class="game-slot-img" alt="Modkit"></div>`;
                    } else {
                        slotsHtml += `<div class="game-slot-cell is-empty" data-slot="${i}" title="Boş Eklenti Yuvası (Takmak için tıkla)"></div>`;
                    }
                }
                eklentilerRowHtml = `
                    <div class="game-stat-item">
                        <span class="game-stat-name">Eklentiler</span>
                        <div class="game-slots-wrapper">
                            ${slotsHtml}
                        </div>
                    </div>
                `;
            }

            statsHtml = `
                <div class="game-stats-container">
                    <!-- Sol Kolon -->
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <div class="game-stat-item">
                            <span class="game-stat-name">Hasar</span>
                            <div class="game-stat-bar-trough">
                                <div class="game-stat-bar-fill" style="width: ${dmg}%;"></div>
                            </div>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-name">Atış Hızı</span>
                            <div class="game-stat-bar-trough">
                                <div class="game-stat-bar-fill" style="width: ${rate}%;"></div>
                            </div>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-name">Cephane</span>
                            <div class="game-stat-bar-trough">
                                <div class="game-stat-bar-fill" style="width: ${ammo}%;"></div>
                            </div>
                        </div>
                        ${eklentilerRowHtml}
                    </div>

                    <!-- Sağ Kolon -->
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <div class="game-stat-item">
                            <span class="game-stat-name">Hız</span>
                            <div class="game-stat-bar-trough">
                                <div class="game-stat-bar-fill" style="width: ${speed}%;"></div>
                            </div>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-name">İsabet</span>
                            <div class="game-stat-bar-trough">
                                <div class="game-stat-bar-fill" style="width: ${acc}%;"></div>
                            </div>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-name">Dürbün</span>
                            <div class="game-stat-bar-trough">
                                <div class="game-stat-bar-fill" style="width: ${scope}%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Buton Metni:
        // 1. item.inGameAction varsa onu kullan (ör. "Bu eşyayı al", "Pazara Koy")
        // 2. item.seller varsa (2. el pazar ilanı) -> "Satın Al"
        // 3. Dükkan / Kristal eşyası ise -> "Bu eşyayı al"
        const actionLabel = item.inGameAction || (item.seller ? "Satın Al" : "Bu eşyayı al");

        // İnceleme / Önizleme ikonu (Görsel 2'deki gibi pazara koy / envanter eşyalarında mevcuttur)
        const inspectHtml = (item.inGameAction === "Pazara Koy") ? `
            <button type="button" class="game-inspect-btn" id="game-inspect-btn" title="Tam Ekran / Odak İnceleme">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#756b54" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>
                </svg>
            </button>
        ` : '';

        // Görsel URL'si ve Para Birimi İkonu
        const previewImgSrc = item.image || "./img/items/light_machine_gun_trans.png";
        const coinIconClass = isCrystal ? "game-crystal-icon" : "game-coin-icon";

        modalContent.innerHTML = `
            <!-- Üst Eşya Bilgileri ve Sağdaki Yüzen Eşya Görseli -->
            <div class="game-item-top">
                <h4 class="game-item-name">${item.name}</h4>
                <div class="game-item-price-row">
                    <span>${priceLabel}: ${formattedPrice} ${currencyName}</span>
                    <img src="${coinIconSrc}" class="${coinIconClass}" alt="${currencyName}">
                </div>
                <div class="game-item-type">${itemType}</div>
                ${metaHtml}
                <img src="${previewImgSrc}" alt="${item.name}" class="game-item-float-img" id="game-float-img" title="Büyütmek için tıkla">
            </div>

            <!-- Orta Bölüm: Silah İstatistikleri veya Ek Bilgiler -->
            ${statsHtml}

            <!-- Alt Kısım: İnceleme İkonu ve Buton -->
            <div class="game-modal-footer">
                ${inspectHtml}
                <button type="button" class="game-action-btn" id="game-action-btn">${actionLabel}</button>
            </div>

            <!-- Bildirim Balonu -->
            <div class="game-modal-toast" id="game-modal-toast"></div>

            <!-- Opsiyonel Açılır Pazar Grafiği & Detaylı Wiki Çekmecesi -->
            <a class="game-wiki-toggle" id="game-wiki-toggle">▾ Pazar Fiyat Geçmişi & Wiki Notları</a>
            <div class="game-wiki-drawer" id="game-wiki-drawer">
                <div style="font-size:12.5px; color:#3a3224; line-height:1.45; margin-bottom:10px;">
                    <b>Eşya Tanımı:</b> ${item.description || 'Detaylı wiki kaydı bulunmamaktadır.'}
                </div>
                ${item.priceHistory && item.priceHistory.length > 0 ? `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-size:11px; font-weight:800; color:#5c5138; text-transform:uppercase;">Son 4 Ay Fiyat Değişimi:</span>
                        <button type="button" id="modal-view-chart-btn" style="background:#240c04; color:#fff; border:none; border-radius:6px; font-size:11px; font-weight:700; padding:4px 8px; cursor:pointer;">Ana Grafikte Aç 📈</button>
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        ${item.priceHistory.map(ph => `
                            <div style="flex:1; min-width:70px; background:#fff8ea; border:1px solid #c9bea3; border-radius:6px; padding:4px 6px; text-align:center;">
                                <span style="font-size:10px; color:#7a6f56; display:block;">${ph.date}</span>
                                <b style="font-size:12px; color:#240c04;">${ph.price.toLocaleString('tr-TR')}</b>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        modalOverlay.classList.add("is-open");

        // Etkileşimler
        const actionBtn = document.getElementById("game-action-btn");
        const toast = document.getElementById("game-modal-toast");
        const inspectBtn = document.getElementById("game-inspect-btn");
        const floatImg = document.getElementById("game-float-img");
        const wikiToggle = document.getElementById("game-wiki-toggle");
        const wikiDrawer = document.getElementById("game-wiki-drawer");
        const modalChartBtn = document.getElementById("modal-view-chart-btn");

        function showToast(msg) {
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.add("is-shown");
            setTimeout(() => {
                toast.classList.remove("is-shown");
            }, 2200);
        }

        // Satın Al / Bu eşyayı al / Pazara Koy / Kullan Butonu
        if (actionBtn) {
            actionBtn.addEventListener("click", () => {
                if (actionLabel === "Kullan") {
                    showToast(`✓ ${item.name} kullanıldı! Etki 2 saat boyunca aktif.`);
                } else if (actionLabel === "Satın Al") {
                    showToast(`✓ ${item.name} (${formattedPrice} ${currencyName}) pazardan satın alındı!`);
                } else if (actionLabel === "Bu eşyayı al") {
                    showToast(`✓ ${item.name} (${formattedPrice} ${currencyName}) dükkandan alındı!`);
                } else {
                    showToast(`✓ ${item.name} başarıyla pazara konuldu!`);
                }
            });
        }

        // Kadraj / Büyütme
        let isZoomed = false;
        function toggleZoom() {
            isZoomed = !isZoomed;
            if (floatImg) {
                if (isZoomed) {
                    floatImg.style.transform = "scale(1.8) translateY(20px)";
                    floatImg.style.zIndex = "20";
                    showToast("🔍 İnceleme Modu Açıldı");
                } else {
                    floatImg.style.transform = "none";
                    floatImg.style.zIndex = "auto";
                }
            }
        }
        if (inspectBtn) inspectBtn.addEventListener("click", toggleZoom);
        if (floatImg) floatImg.addEventListener("click", toggleZoom);

        // Modkit Yuvalarına Tıklama (Tak / Çıkar İnteraktivitesi)
        modalContent.querySelectorAll(".game-slot-cell").forEach(slot => {
            slot.addEventListener("click", () => {
                const isEq = slot.classList.contains("is-equipped");
                if (isEq) {
                    slot.classList.remove("is-equipped");
                    slot.classList.add("is-empty");
                    slot.innerHTML = '';
                    showToast("⚙️ Modkit söküldü.");
                } else {
                    slot.classList.remove("is-empty");
                    slot.classList.add("is-equipped");
                    slot.innerHTML = '<img src="./img/items/paintball_modkit_588_trans.png" class="game-slot-img" alt="Modkit">';
                    showToast("⚙️ Modkit takıldı (+Bonus aktif)!");
                }
            });
        });

        // Wiki Çekmecesi Aç/Kapa
        if (wikiToggle && wikiDrawer) {
            wikiToggle.addEventListener("click", () => {
                const isOpen = wikiDrawer.classList.toggle("is-open");
                wikiToggle.textContent = isOpen ? "▴ Detaylı Wiki Bilgisini Gizle" : "▾ Pazar Fiyat Geçmişi & Wiki Notları";
            });
        }

        // Ana Grafikte İncele
        if (modalChartBtn) {
            modalChartBtn.addEventListener("click", () => {
                modalOverlay.classList.remove("is-open");
                state.selectedChartItem = item.id;
                if (chartSelect) chartSelect.value = item.id;
                renderChart();
                const marketSection = document.getElementById("market-section");
                if (marketSection) marketSection.scrollIntoView({ behavior: "smooth" });
            });
        }
    }

    // Modalı kapat
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener("click", () => {
            modalOverlay.classList.remove("is-open");
        });
    }
    if (modalOverlay) {
        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) modalOverlay.classList.remove("is-open");
        });
    }
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalOverlay && modalOverlay.classList.contains("is-open")) {
            modalOverlay.classList.remove("is-open");
        }
    });

    // 2. FİYAT GEÇMİŞİ İNTERAKTİF GRAFİĞİ (SVG CHART)
    function populateChartSelect() {
        if (!chartSelect) return;
        if (!chartSelect) return;
        const allItems = getAllItems().filter(i => i.priceHistory && i.priceHistory.length > 0);
        chartSelect.innerHTML = allItems.map(item => {
            const curTag = item.currency === 'crystal' ? '💎 Crystal' : '🪙 Cash';
            return `
                <option value="${item.id}" ${item.id === state.selectedChartItem ? 'selected' : ''}>
                    ${item.name} (${item.price.toLocaleString('tr-TR')} ${curTag})
                </option>
            `;
        }).join('');

        chartSelect.addEventListener("change", (e) => {
            state.selectedChartItem = e.target.value;
            renderChart();
        });
    }

    function renderChart() {
        if (!chartSvg) return;
        const item = getAllItems().find(i => i.id === state.selectedChartItem);
        if (!item || !item.priceHistory || item.priceHistory.length === 0) return;

        const data = item.priceHistory;
        const width = 800;
        const height = 220;
        const paddingLeft = 60;
        const paddingRight = 40;
        const paddingTop = 25;
        const paddingBottom = 40;

        const prices = data.map(d => d.price);
        const minPrice = Math.floor(Math.min(...prices) * 0.85);
        const maxPrice = Math.ceil(Math.max(...prices) * 1.15);
        const priceRange = maxPrice - minPrice || 1;

        const plotWidth = width - paddingLeft - paddingRight;
        const plotHeight = height - paddingTop - paddingBottom;

        // X ve Y hesaplamaları
        const points = data.map((d, index) => {
            const x = paddingLeft + (index / (data.length - 1)) * plotWidth;
            const y = paddingTop + plotHeight - ((d.price - minPrice) / priceRange) * plotHeight;
            return { x, y, date: d.date, price: d.price };
        });

        // Çizgi ve Alan Yolları
        const linePathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const areaPathD = `${linePathD} L ${points[points.length - 1].x} ${paddingTop + plotHeight} L ${points[0].x} ${paddingTop + plotHeight} Z`;

        // SVG Izgara Çizgileri ve Eksenler
        let gridHtml = '';
        const gridSteps = 4;
        const curLabel = item.currency === 'crystal' ? 'Cry' : 'Cash';
        for (let i = 0; i <= gridSteps; i++) {
            const yVal = paddingTop + (i / gridSteps) * plotHeight;
            const pVal = Math.round(maxPrice - (i / gridSteps) * priceRange);
            gridHtml += `
                <line x1="${paddingLeft}" y1="${yVal}" x2="${width - paddingRight}" y2="${yVal}" class="chart-grid-line" />
                <text x="${paddingLeft - 10}" y="${yVal + 4}" text-anchor="end" class="chart-axis-text">${pVal.toLocaleString('tr-TR')} ${curLabel}</text>
            `;
        }

        // X Ekseni Tarihleri
        let xAxisHtml = points.map(p => `
            <text x="${p.x}" y="${height - 15}" text-anchor="middle" class="chart-axis-text">${p.date}</text>
            <line x1="${p.x}" y1="${paddingTop}" x2="${p.x}" y2="${paddingTop + plotHeight}" stroke="rgba(46,42,24,0.06)" />
        `).join('');

        // Noktalar
        let pointsHtml = points.map((p, idx) => `
            <circle cx="${p.x}" cy="${p.y}" r="6" class="chart-point" data-idx="${idx}" />
        `).join('');

        chartSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        chartSvg.innerHTML = `
            <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--orange)" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="var(--orange)" stop-opacity="0.0" />
                </linearGradient>
            </defs>
            ${gridHtml}
            ${xAxisHtml}
            <path d="${areaPathD}" fill="url(#chartGrad)" />
            <path d="${linePathD}" class="chart-path" />
            ${pointsHtml}
        `;

        // Noktalara hover ile tooltip
        const circles = chartSvg.querySelectorAll(".chart-point");
        circles.forEach(circle => {
            circle.addEventListener("mouseenter", (e) => {
                const idx = parseInt(circle.getAttribute("data-idx"));
                const p = points[idx];
                const rect = chartSvg.getBoundingClientRect();
                const scaleX = rect.width / width;
                const scaleY = rect.height / height;

                if (chartTooltip) {
                    const iconImg = item.currency === 'crystal'
                        ? '<img src="./img/crystal_gem_trans.png" style="width:14px;height:11px;vertical-align:middle;margin-right:3px;" alt="Crystal">'
                        : '<img src="./img/cash_coin_trans.png" style="width:14px;height:12px;vertical-align:middle;margin-right:3px;" alt="Cash">';
                    const curName = item.currency === 'crystal' ? 'Crystal' : 'Cash';
                    chartTooltip.innerHTML = `<b>${p.date}</b>: ${iconImg} ${p.price.toLocaleString('tr-TR')} ${curName}`;
                    chartTooltip.style.left = `${p.x * scaleX}px`;
                    chartTooltip.style.top = `${p.y * scaleY}px`;
                    chartTooltip.style.opacity = "1";
                }
            });

            circle.addEventListener("mouseleave", () => {
                if (chartTooltip) chartTooltip.style.opacity = "0";
            });
        });
    }

    // 3. MARKET TABLOSUNU DOLDUR
    function renderMarketTable() {
        if (!marketTableBody) return;
        if (!marketTableBody) return;
        const items = getAllItems().filter(i => i.priceHistory && i.priceHistory.length > 0);

        marketTableBody.innerHTML = items.map(item => {
            const icon = getItemIcon(item);
            const change = item.change24h || 0;
            const trendClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
            const trendIcon = change > 0 ? '▲ +' : change < 0 ? '▼ ' : '— ';

            return `
                <tr data-id="${item.id}" style="cursor:pointer;">
                    <td>
                        <div class="item-cell">
                            <span class="item-mini-icon">${icon}</span>
                            <div>
                                <b style="font-family:var(--font-display); font-size:14px;">${item.name}</b>
                                <span style="display:block; font-size:11.5px; color:var(--ink-dim);">${item.subType || item.rarityName || ''}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="rarity-pill rarity-${item.rarity || 'common'}">${item.rarityName || 'Standart'}</span>
                    </td>
                    <td>
                        ${renderPriceHtml(item)}
                    </td>
                    <td>
                        <span class="trend-badge ${trendClass}">${trendIcon}${change}%</span>
                    </td>
                    <td>
                        <button type="button" class="details-btn" onclick="event.stopPropagation();">Grafik</button>
                    </td>
                </tr>
            `;
        }).join('');

        marketTableBody.querySelectorAll("tr").forEach(row => {
            row.addEventListener("click", () => {
                const id = row.getAttribute("data-id");
                state.selectedChartItem = id;
                if (chartSelect) chartSelect.value = id;
                renderChart();
                const chartBox = document.querySelector(".chart-box");
                if (chartBox) chartBox.scrollIntoView({ behavior: "smooth", block: "center" });
            });
        });
    }

    // 4. ETKİLEŞİM DİNLEYİCİLERİ
    // Kategori Sekmeleri
    if (categoryNav) {
        // Fare tekerleği ile yatay kaydırma desteği
        categoryNav.addEventListener("wheel", (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                categoryNav.scrollLeft += e.deltaY;
            }
        }, { passive: false });

        // Fare ile basıp sürükleme desteği (Drag-to-scroll)
        let isDown = false;
        let startX = 0;
        let scrollStart = 0;
        let dragged = false;

        categoryNav.addEventListener("mousedown", (e) => {
            isDown = true;
            dragged = false;
            startX = e.pageX - categoryNav.offsetLeft;
            scrollStart = categoryNav.scrollLeft;
        });

        window.addEventListener("mouseup", () => {
            isDown = false;
        });

        categoryNav.addEventListener("mousemove", (e) => {
            if (!isDown) return;
            const x = e.pageX - categoryNav.offsetLeft;
            const walk = (x - startX);
            if (Math.abs(walk) > 5) {
                dragged = true;
                categoryNav.scrollLeft = scrollStart - walk;
            }
        });

        categoryNav.querySelectorAll(".cat-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                if (dragged) {
                    e.preventDefault();
                    return;
                }
                categoryNav.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("is-active"));
                btn.classList.add("is-active");
                state.activeCategory = btn.getAttribute("data-cat");

                // Tıklanan butonu görünür alana kaydır
                btn.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });

                // Eğer Market seçildiyse Market bölümüne kaydır
                if (state.activeCategory === "market") {
                    const mSec = document.getElementById("market-section");
                    if (mSec) mSec.scrollIntoView({ behavior: "smooth" });
                } else if (state.activeCategory === "drops") {
                    const dSec = document.getElementById("falling-rate-section");
                    if (dSec) dSec.scrollIntoView({ behavior: "smooth" });
                } else {
                    renderCards();
                    const filterPanel = document.querySelector(".filter-panel");
                    if (filterPanel) filterPanel.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            });
        });
    }

    // Arama Girişi
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            state.searchQuery = e.target.value;
            renderCards();
        });
    }

    // Sıralama Seçimi
    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            state.sortBy = e.target.value;
            renderCards();
        });
    }

    // 5. BOSS & DÜŞMAN REHBERİ VE HASAR SİMÜLATÖRÜ (CYBORG COMMANDER 4016 HP & CYBORG SOLDIER 250 HP)
    function initBossCalculator() {
        const weaponSelect = document.getElementById("boss-weapon-select");
        if (!weaponSelect) return;
        const dmgDisplay = document.getElementById("calc-dmg-display");
        const hitsDisplay = document.getElementById("calc-hits-display");
        const hitsLabel = document.getElementById("calc-hits-label");
        const magDisplay = document.getElementById("calc-mag-display");
        const fireBtn = document.getElementById("btn-fire-test");
        const fireDmgSpan = document.getElementById("btn-fire-dmg");
        const resetBtn = document.getElementById("btn-reset-hp");
        const resetHpValSpan = document.getElementById("btn-reset-hp-val");
        const hpValSpan = document.getElementById("commander-hp-val");
        const hpMaxSpan = document.getElementById("commander-hp-max");
        const hpFillBar = document.getElementById("commander-hp-fill");
        const tipBox = document.getElementById("calc-benchmark-text");
        
        // Düşman Profil Elemanları
        const avatarImg = document.getElementById("boss-avatar-img");
        const hpTag = document.getElementById("boss-hp-tag");
        const nameEl = document.getElementById("boss-name");
        const nametagPreview = document.getElementById("boss-nametag-preview");
        const typeBadge = document.getElementById("boss-type-badge");
        const equipTags = document.getElementById("boss-equipment-tags");
        const descEl = document.getElementById("boss-desc");
        const modeBadge = document.getElementById("boss-mode-badge");
        const switchBtns = document.querySelectorAll(".enemy-switch-btn");

        if (!weaponSelect || !MINIFAL_DATABASE.bosses) return;

        let activeEnemyId = "boss-commander";
        let activeEnemy = MINIFAL_DATABASE.bosses.find(b => b.id === activeEnemyId) || MINIFAL_DATABASE.bosses[0];
        let currentHp = activeEnemy.maxHp;

        function setTargetEnemy(enemyId) {
            const found = MINIFAL_DATABASE.bosses.find(b => b.id === enemyId);
            if (!found) return;

            activeEnemyId = enemyId;
            activeEnemy = found;
            currentHp = activeEnemy.maxHp;

            // Sekmeleri güncelle
            switchBtns.forEach(btn => {
                const isTarget = btn.getAttribute("data-target") === enemyId;
                btn.classList.toggle("active", isTarget);
                btn.setAttribute("aria-selected", isTarget ? "true" : "false");
            });

            // Profil kartını güncelle
            if (avatarImg) {
                avatarImg.src = activeEnemy.image;
                avatarImg.alt = activeEnemy.name;
            }
            if (hpTag) hpTag.textContent = `CAN: ${activeEnemy.maxHp.toLocaleString("tr-TR")} HP`;
            if (nameEl) nameEl.textContent = activeEnemy.name;
            if (nametagPreview) nametagPreview.textContent = activeEnemy.inGameName || activeEnemy.name;
            if (typeBadge) typeBadge.textContent = activeEnemy.title;
            if (descEl) descEl.textContent = activeEnemy.description;
            if (modeBadge) modeBadge.textContent = activeEnemy.gameMode || "Game Type 4: Survival";

            if (equipTags) {
                if (activeEnemy.id === "boss-commander") {
                    equipTags.innerHTML = `
                        <span class="boss-tag">🛡️ Ağır Komuta Zırhı</span>
                        <span class="boss-tag">🔫 Ağır Paintball Topu</span>
                        <span class="boss-tag boss-tag--green">🟢 Yeşil Neon Vizör</span>
                    `;
                } else {
                    equipTags.innerHTML = `
                        <span class="boss-tag">🛡️ Hafif Taktik Zırh</span>
                        <span class="boss-tag">🔫 Seri Paintball Tüfeği</span>
                        <span class="boss-tag boss-tag--red">🔴 Kırmızı Termal Vizör</span>
                    `;
                }
            }

            // Can çubuğunu sıfırla
            if (hpValSpan) hpValSpan.textContent = activeEnemy.maxHp.toLocaleString("tr-TR");
            if (hpMaxSpan) hpMaxSpan.textContent = activeEnemy.maxHp.toLocaleString("tr-TR");
            if (resetHpValSpan) resetHpValSpan.textContent = activeEnemy.maxHp.toLocaleString("tr-TR");
            if (hpFillBar) {
                hpFillBar.style.width = "100%";
                hpFillBar.style.background = activeEnemy.glowColor || "var(--orange)";
            }

            if (hitsLabel) hitsLabel.textContent = `${activeEnemy.name} İçin Gereken Vuruş`;

            updateCalculations();
        }

        function updateCalculations() {
            const opt = weaponSelect.options[weaponSelect.selectedIndex];
            const dmg = parseInt(opt.value, 10) || 12;
            const cap = parseInt(opt.getAttribute("data-cap"), 10) || 60;
            const wName = opt.getAttribute("data-name") || "Silah";

            const hitsNeeded = Math.ceil(activeEnemy.maxHp / dmg);
            const magsNeeded = (hitsNeeded / cap).toFixed(1);

            if (dmgDisplay) dmgDisplay.textContent = `${dmg} Hasar`;
            if (hitsDisplay) hitsDisplay.textContent = `${hitsNeeded} Mermi`;
            if (magDisplay) magDisplay.textContent = `~${magsNeeded} Şarjör (${cap}'lık)`;
            if (fireDmgSpan) fireDmgSpan.textContent = dmg;

            if (tipBox) {
                if (activeEnemy.id === "boss-commander") {
                    if (wName === "Light Machine Gun") {
                        tipBox.innerHTML = `💡 <b>Resmi Minifal Ölçütü:</b> 12 hasar veren <b>Light Machine Gun</b> ile 4.016 canı olan <b>Cyborg Commander</b>'ı indirmek için tam <b>335 isabetli mermi</b> gerekir (4016 ÷ 12 ≈ 334.6).`;
                    } else {
                        tipBox.innerHTML = `💡 <b>Hesaplama:</b> ${dmg} hasar veren <b>${wName}</b> ile 4.016 canı olan <b>Cyborg Commander</b>'ı devirmek için <b>${hitsNeeded} isabetli mermi</b> gerekir.`;
                    }
                } else {
                    if (wName === "Assault Rifle") {
                        tipBox.innerHTML = `💡 <b>Piyade Karşılaşması:</b> 18 hasar veren <b>Assault Rifle</b> ile 250 canı olan <b>Cyborg Soldier</b>'ı düşürmek için <b>14 isabetli mermi</b> yeterlidir (250 ÷ 18 ≈ 13.8).`;
                    } else {
                        tipBox.innerHTML = `💡 <b>Hesaplama:</b> ${dmg} hasar veren <b>${wName}</b> ile 250 canı olan <b>Cyborg Soldier</b>'ı düşürmek için <b>${hitsNeeded} isabetli mermi</b> gerekir.`;
                    }
                }
            }
        }

        // Sekme Değişimi Dinleyicileri
        switchBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const target = btn.getAttribute("data-target");
                if (target) setTargetEnemy(target);
            });
        });

        weaponSelect.addEventListener("change", updateCalculations);

        if (fireBtn) {
            fireBtn.addEventListener("click", () => {
                const opt = weaponSelect.options[weaponSelect.selectedIndex];
                const dmg = parseInt(opt.value, 10) || 12;

                currentHp = Math.max(0, currentHp - dmg);
                const pct = (currentHp / activeEnemy.maxHp) * 100;

                if (hpValSpan) hpValSpan.textContent = currentHp.toLocaleString("tr-TR");
                if (hpFillBar) hpFillBar.style.width = `${pct}%`;

                if (currentHp <= 0) {
                    fireBtn.textContent = `🏆 ${activeEnemy.name} Düştü! Zafer!`;
                } else {
                    fireBtn.innerHTML = `💥 -${dmg} Vuruldu! (Kalan: ${currentHp.toLocaleString("tr-TR")} HP)`;
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                currentHp = activeEnemy.maxHp;
                if (hpValSpan) hpValSpan.textContent = activeEnemy.maxHp.toLocaleString("tr-TR");
                if (hpFillBar) hpFillBar.style.width = "100%";
                const opt = weaponSelect.options[weaponSelect.selectedIndex];
                const dmg = parseInt(opt.value, 10) || 12;
                if (fireBtn) fireBtn.innerHTML = `💥 Test Ateşi Aç (-<span id="btn-fire-dmg">${dmg}</span> Hasar)`;
            });
        }

        setTargetEnemy("boss-commander");
    }

    
    // ==============================================================================
    // HARİTA, MEKÂNLAR VE SATICILAR (NPC) FONKSİYONLARI
    // ==============================================================================
    function renderHaritaAndLocations() {
        const locsGrid = document.getElementById("harita-locs-grid");
        if (!locsGrid || !MINIFAL_DATABASE.mapData) return;

        const locs = MINIFAL_DATABASE.mapData.locations || [];
        locsGrid.innerHTML = locs.map(loc => {
            const hasNpcs = loc.npcs && loc.npcs.length > 0;
            const npcBadges = hasNpcs 
                ? loc.npcs.map(n => `<span class="loc-npc-pill">🏷️ ${n}</span>`).join(" ") + (loc.id === "loc-4" ? ` <span class="loc-npc-pill" style="background:#E0F2FE; color:#0369A1; border-color:#38BDF8;">🛋️ 115 Modern Mobilya</span>` : "")
                : (loc.id === "loc-4" ? `<span class="loc-npc-pill" style="background:#E0F2FE; color:#0369A1; border-color:#38BDF8;">🛋️ 115 Mobilya</span>` : "");

            return `
                <div class="loc-card">
                    <div>
                        <div class="loc-card-top">
                            <h4 class="loc-name">${loc.name}</h4>
                            <span class="loc-badge">${hasNpcs ? (loc.id === "loc-10" ? loc.npcs.length + " Kurucu & Ekip" : loc.npcs.length + " Satıcı") : "Bölge"}</span>
                        </div>
                        <p class="loc-desc">${loc.desc}</p>
                    </div>
                    <div>
                        ${npcBadges}
                    </div>
                </div>
            `;
        }).join("");
    }

    // ==============================================================================
    // PAINTBALL ODA OLUŞTURMA MENÜSÜ MANTIĞI
    // ==============================================================================
    function initPaintballModal() {
        const modal = document.getElementById("paintball-room-modal");
        const openBtn = document.getElementById("btn-open-paintball");
        const triggerCard = document.getElementById("paintball-trigger-card");
        const closeBtn = document.getElementById("room-close-btn");
        const backBtn = document.getElementById("pb-btn-back");
        const createBtn = document.getElementById("pb-btn-create");
        const roomNameInput = document.getElementById("pb-room-name");
        const modeGrid = document.getElementById("pb-mode-grid");
        const modeHint = document.getElementById("pb-mode-hint");
        const playersRow = document.getElementById("pb-players-row");
        const mapsGrid = document.getElementById("pb-maps-grid");
        const mapHint = document.getElementById("pb-map-hint");
        const openCountText = document.getElementById("pb-open-rooms-text");

        if (!modal) return;

        let currentOpenRooms = (MINIFAL_DATABASE.paintball && MINIFAL_DATABASE.paintball.openRoomsCount) || 2;
        let selectedMode = "ctf";
        let selectedModeName = "Bayrak Kapmaca";
        let selectedPlayers = "8";
        let selectedMapNum = 1;

        const modeHints = {
            "ctf": "🚩 Bayrak Kapmaca: Rakip takımın bayrağını ele geçirip kendi üssüne getir!",
            "dm": "💀 Ölüm Maçı: En çok boya atışıyla rakip eleyen kazanır!",
            "cyborg": "🤖 Cyborg Saldırısı: Robot dalgalarına ve dev Cyborg Boss'a karşı takımla savaş!",
            "starter": "🔰 Başlangıç Maçı: Haritayı ve boya silahlarını tanımak için alıştırma arenası."
        };

        const mapHints = {
            1: "🏞️ Harita 1: Şelale & Ahşap Köprü Vadisi (Doğal nehir yatağı & açık vadi)",
            2: "🏥 Harita 2: Klinik & Dinlenme Salonu (İç mekân masaları & dar koridorlar)",
            3: "🏙️ Harita 3: Şehir Caddesi & Binalar (Sokak lambaları & taktik bina köşeleri)",
            4: "🧱 Harita 4: Harabe Taş Ev & Çimenlik (Tuğla siperler & pusu pencereleri)"
        };

        function openModal() {
            modal.classList.add("is-open");
            modal.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
            if (roomNameInput) {
                roomNameInput.focus();
                roomNameInput.select();
            }
        }

        function closeModal() {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
        }

        // Açılış Tetikleyicileri
        if (openBtn) {
            openBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openModal();
            });
        }

        if (triggerCard) {
            triggerCard.addEventListener("click", () => {
                openModal();
            });
        }

        // Kapanış Tetikleyicileri
        if (closeBtn) closeBtn.addEventListener("click", closeModal);
        if (backBtn) backBtn.addEventListener("click", closeModal);

        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && modal.classList.contains("is-open")) {
                closeModal();
            }
        });

        // Mod Seçimi
        if (modeGrid) {
            const modeBtns = modeGrid.querySelectorAll(".mode-choice-btn");
            modeBtns.forEach(btn => {
                btn.addEventListener("click", () => {
                    modeBtns.forEach(b => b.classList.remove("is-active"));
                    btn.classList.add("is-active");
                    selectedMode = btn.getAttribute("data-mode-id") || "ctf";
                    selectedModeName = btn.getAttribute("data-mode-name") || btn.textContent.trim();
                    if (modeHint && modeHints[selectedMode]) {
                        modeHint.textContent = modeHints[selectedMode];
                    }
                });
            });
        }

        // Oyuncu Sayısı Seçimi
        if (playersRow) {
            const playerBtns = playersRow.querySelectorAll(".player-choice-btn");
            playerBtns.forEach(btn => {
                btn.addEventListener("click", () => {
                    playerBtns.forEach(b => b.classList.remove("is-active"));
                    btn.classList.add("is-active");
                    selectedPlayers = btn.getAttribute("data-players") || "8";
                });
            });
        }

        // Harita Seçimi
        if (mapsGrid) {
            const mapCards = mapsGrid.querySelectorAll(".map-card-select");
            mapCards.forEach(card => {
                card.addEventListener("click", () => {
                    mapCards.forEach(c => c.classList.remove("is-active"));
                    card.classList.add("is-active");
                    const num = parseInt(card.getAttribute("data-map-num"), 10) || 1;
                    selectedMapNum = num;
                    if (mapHint && mapHints[num]) {
                        mapHint.textContent = mapHints[num];
                    }
                });
            });
        }

        // Oda Oluştur Butonu
        if (createBtn) {
            createBtn.addEventListener("click", () => {
                const roomName = (roomNameInput && roomNameInput.value.trim()) ? roomNameInput.value.trim() : "Minifal Paintball Odası";
                currentOpenRooms += 1;
                if (openCountText) {
                    openCountText.textContent = `${currentOpenRooms} oda açık`;
                }

                // Bilgilendirme ve Yönlendirme Seçeneği
                const confirmMsg = `🎉 Tebrikler! "${roomName}" odası başarıyla açıldı!\n\n` +
                    `🕹️ Mod: ${selectedModeName}\n` +
                    `👥 Kapasite: ${selectedPlayers} Kişilik\n` +
                    `🗺️ Seçili Alan: Harita ${selectedMapNum}\n\n` +
                    `Gerçek oyunda lobiye bağlanmak istiyor musunuz? (minifal.com/play)`;

                if (confirm(confirmMsg)) {
                    window.location.href = "https://minifal.com/play";
                } else {
                    closeModal();
                }
            });
        }
    }

    // ==============================================================================
    // FOOTBALL ODA OLUŞTURMA MENÜSÜ MANTIĞI
    // ==============================================================================
    function initFootballModal() {
        const modal = document.getElementById("football-room-modal");
        const openBtn = document.getElementById("btn-open-football");
        const triggerCard = document.getElementById("football-trigger-card");
        const closeBtn = document.getElementById("football-close-btn");
        const backBtn = document.getElementById("fb-btn-back");
        const createBtn = document.getElementById("fb-btn-create");
        const roomNameInput = document.getElementById("fb-room-name");
        const playersGrid = document.getElementById("fb-players-grid");

        if (!modal) return;

        let selectedPlayers = "6";

        function openModal() {
            modal.classList.add("is-open");
            modal.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
            if (roomNameInput) {
                roomNameInput.focus();
                roomNameInput.select();
            }
        }

        function closeModal() {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
        }

        // Açılış Tetikleyicileri
        if (openBtn) {
            openBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openModal();
            });
        }

        if (triggerCard) {
            triggerCard.addEventListener("click", () => {
                openModal();
            });
        }

        // Kapanış Tetikleyicileri
        if (closeBtn) closeBtn.addEventListener("click", closeModal);
        if (backBtn) backBtn.addEventListener("click", closeModal);

        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && modal.classList.contains("is-open")) {
                closeModal();
            }
        });

        // Oyuncu Sayısı Seçimi (2, 4, 6, 10, 14)
        if (playersGrid) {
            const playerBtns = playersGrid.querySelectorAll(".player-choice-btn");
            playerBtns.forEach(btn => {
                btn.addEventListener("click", () => {
                    playerBtns.forEach(b => b.classList.remove("is-active"));
                    btn.classList.add("is-active");
                    selectedPlayers = btn.getAttribute("data-fb-players") || "6";
                });
            });
        }

        // Oda Oluştur Butonu
        if (createBtn) {
            createBtn.addEventListener("click", () => {
                const roomName = (roomNameInput && roomNameInput.value.trim()) ? roomNameInput.value.trim() : "Minifal Stadyum Maçı";

                const confirmMsg = `🎉 Tebrikler! "${roomName}" futbol maçı odası başarıyla açıldı!\n\n` +
                    `⚽ Saha: Minifal Merkez Stadyumu\n` +
                    `👥 Kapasite: ${selectedPlayers} Kişilik Saha Maçı\n\n` +
                    `Gerçek oyunda stadyuma bağlanmak istiyor musunuz? (minifal.com/play)`;

                if (confirm(confirmMsg)) {
                    window.location.href = "https://minifal.com/play";
                } else {
                    closeModal();
                }
            });
        }
    }

    // ==============================================================================
    // TENİS ODA OLUŞTURMA MENÜSÜ MANTIĞI
    // ==============================================================================
    function initTennisModal() {
        const modal = document.getElementById("tennis-room-modal");
        const openBtn = document.getElementById("btn-open-tennis");
        const triggerCard = document.getElementById("tennis-trigger-card");
        const closeBtn = document.getElementById("tennis-close-btn");
        const backBtn = document.getElementById("tn-btn-back");
        const createBtn = document.getElementById("tn-btn-create");
        const roomNameInput = document.getElementById("tn-room-name");
        const playersRow = document.getElementById("tn-players-row");
        const courtsGrid = document.getElementById("tn-courts-grid");
        const courtHint = document.getElementById("tn-court-hint");

        if (!modal) return;

        let selectedMode = "1 vs 1";
        let selectedCourtNum = 1;

        const courtHints = {
            1: "🌱 Kort 1: Yeşil Çim Kort (Hızlı zemin & düşük sekme)",
            2: "🧱 Kort 2: Kırmızı Toprak Kort (Yavaş zemin & yüksek sekme)"
        };

        function openModal() {
            modal.classList.add("is-open");
            modal.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
            if (roomNameInput) {
                roomNameInput.focus();
                roomNameInput.select();
            }
        }

        function closeModal() {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
        }

        // Açılış Tetikleyicileri
        if (openBtn) {
            openBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openModal();
            });
        }

        if (triggerCard) {
            triggerCard.addEventListener("click", () => {
                openModal();
            });
        }

        // Kapanış Tetikleyicileri
        if (closeBtn) closeBtn.addEventListener("click", closeModal);
        if (backBtn) backBtn.addEventListener("click", closeModal);

        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && modal.classList.contains("is-open")) {
                closeModal();
            }
        });

        // Oyuncu Sayısı Seçimi (1 vs 1, 2 vs 2)
        if (playersRow) {
            const playerBtns = playersRow.querySelectorAll(".player-choice-btn");
            playerBtns.forEach(btn => {
                btn.addEventListener("click", () => {
                    playerBtns.forEach(b => b.classList.remove("is-active"));
                    btn.classList.add("is-active");
                    selectedMode = btn.getAttribute("data-tn-mode") || "1 vs 1";
                });
            });
        }

        // Kort Seçimi
        if (courtsGrid) {
            const courtCards = courtsGrid.querySelectorAll(".map-card-select");
            courtCards.forEach(card => {
                card.addEventListener("click", () => {
                    courtCards.forEach(c => c.classList.remove("is-active"));
                    card.classList.add("is-active");
                    const num = parseInt(card.getAttribute("data-court-num"), 10) || 1;
                    selectedCourtNum = num;
                    if (courtHint && courtHints[num]) {
                        courtHint.textContent = courtHints[num];
                    }
                });
            });
        }

        // Oda Oluştur Butonu
        if (createBtn) {
            createBtn.addEventListener("click", () => {
                const roomName = (roomNameInput && roomNameInput.value.trim()) ? roomNameInput.value.trim() : "Minifal Tenis Turnuvası";
                const courtName = selectedCourtNum === 1 ? "Yeşil Çim Kort" : "Kırmızı Toprak Kort";

                const confirmMsg = `🎉 Tebrikler! "${roomName}" tenis odası başarıyla açıldı!\n\n` +
                    `🎾 Karşılaşma: ${selectedMode}\n` +
                    `🌱 Seçili Alan: Kort ${selectedCourtNum} (${courtName})\n\n` +
                    `Gerçek oyunda kortlara bağlanmak istiyor musunuz? (minifal.com/play)`;

                if (confirm(confirmMsg)) {
                    window.location.href = "https://minifal.com/play";
                } else {
                    closeModal();
                }
            });
        }
    }

    function renderVendors() {
        const vendorsGrid = document.getElementById("vendors-grid");
        if (!vendorsGrid || !MINIFAL_DATABASE.vendors) return;

        vendorsGrid.innerHTML = MINIFAL_DATABASE.vendors.map(v => {
            let actionBtnText = "Detayları Gör";
            let actionAttr = "";

            if (v.id === "vendor-mason" || v.id === "vendor-sebastian") {
                actionBtnText = "🏡 Evleri Gez & Tasarla";
                actionAttr = 'data-action="goto-houses"';
            } else if (v.id === "vendor-hunter") {
                actionBtnText = "🎾 Spor & Tenis Eşyaları";
                actionAttr = 'data-action="filter-sports"';
            } else if (v.id === "vendor-tobias") {
                actionBtnText = "🎪 Eğlence & Oyuncak Eşyaları";
                actionAttr = 'data-action="filter-toys"';
            } else if (v.id === "vendor-vincent") {
                actionBtnText = "📦 İkinci El Pazarı";
                actionAttr = 'data-action="filter-vintage"';
            } else if (v.id === "vendor-hazel") {
                actionBtnText = "🧪 İksirleri İncele";
                actionAttr = 'data-action="filter-potions"';
            } else if (v.id === "vendor-chloe") {
                actionBtnText = "💇 Kuaför & Saç Modelleri";
                actionAttr = 'data-action="filter-masks"';
            } else if (v.id === "vendor-jasper") {
                actionBtnText = "🎫 Kristal Kuponları";
                actionAttr = 'data-action="filter-vouchers"';
            } else if (v.id === "vendor-sergei") {
                actionBtnText = "🐾 Evcil Hayvanlar";
                actionAttr = 'data-action="filter-pets"';
            } else if (v.id === "vendor-ivan") {
                actionBtnText = "🥕 Yem & Bataryalar";
                actionAttr = 'data-action="filter-petfood"';
            } else if (v.id === "vendor-taylor") {
                actionBtnText = "👖 Alt Giyim Reyonu";
                actionAttr = 'data-action="filter-masks"';
            } else if (v.id === "vendor-miles") {
                actionBtnText = "👕 Üst Giyim Reyonu";
                actionAttr = 'data-action="filter-masks"';
            } else if (v.id === "vendor-thomas") {
                actionBtnText = "👟 Ayakkabı Reyonu";
                actionAttr = 'data-action="filter-masks"';
            } else if (v.id === "vendor-hattie") {
                actionBtnText = "🧢 Şapka & Başlık Reyonu";
                actionAttr = 'data-action="filter-masks"';
            } else if (v.id === "vendor-harrison") {
                actionBtnText = "💉 Estetik & Stil Kliniği";
                actionAttr = 'data-action="info-surgery"';
            } else if (v.id === "vendor-ivy") {
                actionBtnText = "🛋️ Mobilyaları İncele";
                actionAttr = 'data-action="filter-furniture"';
            } else if (v.id === "npc-tolga") {
                actionBtnText = "💬 Tolga ile Konuş";
                actionAttr = 'data-action="dialogue-tolga"';
            } else if (v.id === "npc-cem") {
                actionBtnText = "💬 Cem ile Konuş";
                actionAttr = 'data-action="dialogue-cem"';
            } else if (v.id === "npc-taner") {
                actionBtnText = "💻 Geliştirici Mesajı";
                actionAttr = 'data-action="dialogue-taner"';
            } else if (v.id === "npc-marijuannaa") {
                actionBtnText = "📖 Wiki Portalı";
                actionAttr = 'data-action="goto-wiki"';
            } else if (v.id === "vendor-ozalp") {
                actionBtnText = "👕 Odcaf Tişörtleri (300 Cash)";
                actionAttr = 'data-action="filter-odcaf-tshirts"';
            } else if (v.id === "vendor-emre" || v.id === "npc-emre") {
                actionBtnText = "🛋️ Odcaf Mobilyaları (Emre)";
                actionAttr = 'data-action="filter-odcaf-furniture"';
            } else if (v.id === "npc-ether-lord") {
                actionBtnText = "💬 Ether Lord ile Konuş";
                actionAttr = 'data-action="dialogue-ether-lord"';
            }

            return `
                <div class="vendor-card" id="${v.id}">
                    <div class="vendor-avatar-wrap">
                        <img src="${v.avatar}" alt="${v.name}" class="vendor-avatar-img">
                        <span class="vendor-loc-tag">📍 ${v.location}</span>
                    </div>
                    <div class="vendor-body">
                        <h4 class="vendor-name">${v.name}</h4>
                        <span class="vendor-role">${v.role}</span>
                        <div class="vendor-quote">"${v.dialogue}"</div>
                        <span class="vendor-wares-title">Satılan Öne Çıkanlar:</span>
                        <ul class="vendor-wares-list">
                            ${v.itemsForSale.map(item => `<li>${item}</li>`).join("")}
                        </ul>
                        <button type="button" class="vendor-action-btn" ${actionAttr}>${actionBtnText}</button>
                    </div>
                </div>
            `;
        }).join("");

        // Satıcı buton tıklama olayları
        vendorsGrid.querySelectorAll(".vendor-action-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const action = btn.getAttribute("data-action");
                if (action === "goto-houses") {
                    const target = document.getElementById("evler-section");
                    if (target) {
                        target.scrollIntoView({ behavior: "smooth" });
                    } else {
                        window.location.href = "./evler.html";
                    }
                } else if (action === "filter-sports") {
                    const katalog = document.getElementById("katalog");
                    if (katalog) {
                        state.activeCategory = "sports";
                        updateActiveCategoryButton("sports");
                        renderCards();
                        katalog.scrollIntoView({ behavior: "smooth" });
                    } else {
                        window.location.href = "./index.html?cat=sports";
                    }
                } else if (action === "filter-toys") {
                    const katalog = document.getElementById("katalog");
                    if (katalog) {
                        state.activeCategory = "toys";
                        updateActiveCategoryButton("toys");
                        renderCards();
                        katalog.scrollIntoView({ behavior: "smooth" });
                    } else {
                        window.location.href = "./index.html?cat=toys#katalog";
                    }
                } else if (action === "filter-vintage") {
                    const katalog = document.getElementById("katalog");
                    if (katalog) {
                        state.activeCategory = "furniture";
                        updateActiveCategoryButton("furniture");
                        renderCards();
                        katalog.scrollIntoView({ behavior: "smooth" });
                    } else {
                        window.location.href = "./index.html?cat=furniture#katalog";
                    }
                } else if (action === "filter-potions") {
                    const katalog = document.getElementById("katalog");
                    if (katalog) {
                        state.activeCategory = "potions";
                        updateActiveCategoryButton("potions");
                        renderCards();
                        katalog.scrollIntoView({ behavior: "smooth" });
                    } else {
                        window.location.href = "./index.html?cat=potions#katalog";
                    }
                } else if (action === "filter-masks") {
                    const katalog = document.getElementById("katalog");
                    if (katalog) {
                        state.activeCategory = "masks";
                        updateActiveCategoryButton("masks");
                        renderCards();
                        katalog.scrollIntoView({ behavior: "smooth" });
                    } else {
                        window.location.href = "./index.html?cat=masks";
                    }
                } else if (action === "filter-crystal") {
                    const katalog = document.getElementById("katalog");
                    if (katalog) {
                        state.searchQuery = "Crystal";
                        const searchInput = document.getElementById("search-input");
                        if (searchInput) searchInput.value = "Crystal";
                        renderCards();
                        katalog.scrollIntoView({ behavior: "smooth" });
                    } else {
                        window.location.href = "./index.html";
                    }
                } else if (action === "filter-pets") {
                    const katalog = document.getElementById("katalog");
                    if (katalog) {
                        state.activeCategory = "pets";
                        updateActiveCategoryButton("pets");
                        renderCards();
                        katalog.scrollIntoView({ behavior: "smooth" });
                    } else {
                        window.location.href = "./index.html?cat=pets#katalog";
                    }
                } else if (action === "filter-petfood") {
                    const katalog = document.getElementById("katalog");
                    if (katalog) {
                        state.activeCategory = "petfood";
                        updateActiveCategoryButton("petfood");
                        renderCards();
                        katalog.scrollIntoView({ behavior: "smooth" });
                    } else {
                        window.location.href = "./index.html?cat=petfood#katalog";
                    }
                } else if (action === "filter-vouchers") {
                    const katalog = document.getElementById("katalog");
                    if (katalog) {
                        state.activeCategory = "vouchers";
                        updateActiveCategoryButton("vouchers");
                        renderCards();
                        katalog.scrollIntoView({ behavior: "smooth" });
                    } else {
                        window.location.href = "./index.html?cat=vouchers#katalog";
                    }
                } else if (action === "info-pets") {
                    alert("🐾 Evcil hayvanlar ve hayvan yemleri kataloğu başarıyla eklendi! Yukarıdaki sekmelerden inceleyebilirsiniz.");
                } else if (action === "info-surgery") {
                    alert("💉 Dr. Harrison'ın Estetik Ameliyat Kliniğinde karakterinizin ten rengi, yüz hatları, saç kesimi ve tarzı baştan aşağı yenilenmektedir!");
                } else if (action === "filter-furniture") {
                    const katalog = document.getElementById("katalog");
                    if (katalog) {
                        state.activeCategory = "furniture";
                        updateActiveCategoryButton("furniture");
                        renderCards();
                        katalog.scrollIntoView({ behavior: "smooth" });
                    } else {
                        window.location.href = "./index.html?cat=furniture#katalog";
                    }
                } else if (action === "dialogue-tolga") {
                    alert('Tolga:\n"Ben meşgulüm! Seninle Cem uğraşsın."');
                } else if (action === "dialogue-cem") {
                    alert('Cem:\n"Ben çalışıyorum! Seninle Tolga uğraşsın."');
                } else if (action === "dialogue-taner") {
                    alert('Taner [DEV]:\n"Flash öldü ama Minifal yaşıyor! Oyunu modern web teknolojileriyle sıfırdan hayata döndürüyoruz."');
                } else if (action === "filter-odcaf-furniture") {
                    const katalog = document.getElementById("katalog");
                    if (katalog) {
                        state.activeCategory = "furniture";
                        updateActiveCategoryButton("furniture");
                        state.searchQuery = "Odcaf";
                        const searchInput = document.getElementById("search-input");
                        if (searchInput) searchInput.value = "Odcaf";
                        renderCards();
                        katalog.scrollIntoView({ behavior: "smooth" });
                    } else {
                        window.location.href = "./index.html?cat=furniture#katalog";
                    }
                } else if (action === "dialogue-emre") {
                    alert('Emre:\n"Odcaf ofisine hoş geldin! Odcaf logolu arcade makineleri, robot heykelleri, oyun konsolları ve özel mobilyalar benden sorulur."');
                } else if (action === "dialogue-ether-lord") {
                    alert('Ether Lord:\n"..."');
                } else if (action === "filter-odcaf-tshirts") {
                    const katalog = document.getElementById("katalog");
                    if (katalog) {
                        state.activeCategory = "masks";
                        updateActiveCategoryButton("masks");
                        state.searchQuery = "Odcaf";
                        const searchInput = document.getElementById("search-input");
                        if (searchInput) searchInput.value = "Odcaf";
                        renderCards();
                        katalog.scrollIntoView({ behavior: "smooth" });
                    } else {
                        window.location.href = "./index.html?cat=masks#katalog";
                    }
                } else if (action === "goto-wiki") {
                    window.location.href = "./index.html";
                }
            });
        });
    }

    function updateActiveCategoryButton(cat) {
        if (!categoryNav) return;
        categoryNav.querySelectorAll(".cat-btn").forEach(btn => {
            if (btn.getAttribute("data-cat") === cat) {
                btn.classList.add("is-active");
            } else {
                btn.classList.remove("is-active");
            }
        });
    }

    // ==============================================================================
    // EMLAK VE EVLER FONKSİYONLARI
    // ==============================================================================
    function renderHouses() {
        const housesGrid = document.getElementById("houses-grid");
        if (!housesGrid || !MINIFAL_DATABASE.houses) return;

        housesGrid.innerHTML = MINIFAL_DATABASE.houses.map(h => {
            const isCrystal = h.currency === "crystal";
            const coinIcon = isCrystal ? "./img/crystal_gem_trans.png" : "./img/cash_coin_trans.png";

            return `
                <div class="house-card" data-house-id="${h.id}">
                    <div class="house-preview-wrap" data-blueprint-full="${h.fullCard}" title="Büyütmek için tıklayın">
                        <img src="${h.blueprint}" alt="${h.name}" class="house-blueprint-preview">
                        <div class="house-price-tag">
                            <img src="${coinIcon}" style="width:16px;height:16px;object-fit:contain;" alt="">
                            <span>${h.formattedPrice}</span>
                        </div>
                    </div>
                    <div class="house-body">
                        <h4 class="house-name">${h.name}</h4>
                        <div class="house-rooms-pills">
                            ${h.rooms.map(r => `<span class="room-tag">${r}</span>`).join("")}
                        </div>
                        <p class="house-desc">${h.description}</p>
                        <div class="house-actions-row">
                            <button type="button" class="btn-house-view" data-blueprint-full="${h.fullCard}">
                                🔍 Planı Büyüt
                            </button>
                            <button type="button" class="btn-house-design" data-select-house="${h.id}">
                                🛋️ Bu Evi Tasarla
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        // Planı büyütme modal dinleyicileri
        housesGrid.querySelectorAll("[data-blueprint-full]").forEach(el => {
            el.addEventListener("click", () => {
                const fullImg = el.getAttribute("data-blueprint-full");
                if (fullImg) openHouseModal(fullImg);
            });
        });

        // "Bu Evi Tasarla" butonları
        housesGrid.querySelectorAll("[data-select-house]").forEach(btn => {
            btn.addEventListener("click", () => {
                const houseId = btn.getAttribute("data-select-house");
                if (window.designerSwitchRoom) {
                    window.designerSwitchRoom(houseId);
                }
                const designerSec = document.getElementById("tasarimci-section");
                if (designerSec) designerSec.scrollIntoView({ behavior: "smooth" });
            });
        });
    }

    function openHouseModal(imgSrc) {
        if (!modalOverlay || !modalContent) return;
        modalContent.innerHTML = `
            <div style="text-align:center; padding:10px;">
                <img src="${imgSrc}" alt="Ev Planı" style="max-width:100%; max-height:80vh; object-fit:contain; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.2);">
                <div style="margin-top:14px;">
                    <a href="#tasarimci-section" onclick="document.getElementById('item-modal').classList.remove('is-open')" class="btn-mason-tour" style="display:inline-block;">
                        🛋️ Bu Evi Tasarımcıda Aç
                    </a>
                </div>
            </div>
        `;
        modalOverlay.classList.add("is-open");
        modalOverlay.setAttribute("aria-hidden", "false");
    }

    // ==============================================================================
    // İNTERAKTİF EV TASARIMCISI VE ODA PLANLAYICI MANTIĞI
    // ==============================================================================
    function initRoomDesigner() {
        const stage = document.getElementById("furniture-stage");
        const viewport = document.getElementById("room-viewport");
        const world = document.getElementById("room-canvas-world");
        const blueprintImg = document.getElementById("room-blueprint-img");
        const roomLabel = document.getElementById("active-room-label");
        const paletteList = document.getElementById("palette-items-list");
        const paletteSearch = document.getElementById("palette-search");
        const catPills = document.getElementById("palette-cat-pills");
        const counterSpan = document.getElementById("palette-counter");

        const cashTotalSpan = document.getElementById("designer-cash-total");
        const crystalTotalSpan = document.getElementById("designer-crystal-total");
        const countSpan = document.getElementById("designer-item-count");

        const roomButtons = document.querySelectorAll(".room-btn");
        const clearBtn = document.getElementById("btn-clear-room");
        const sampleBtn = document.getElementById("btn-sample-layout");
        const saveBtn = document.getElementById("btn-save-layout");
        const loadBtn = document.getElementById("btn-load-layout");

        const zoomInBtn = document.getElementById("btn-zoom-in");
        const zoomOutBtn = document.getElementById("btn-zoom-out");
        const zoomResetBtn = document.getElementById("btn-zoom-reset");
        const zoomFitBtn = document.getElementById("btn-zoom-fit");
        const zoomValText = document.getElementById("zoom-val-text");

        if (!stage || !viewport) return;

        // Tasarımcı Durumu (Designer State)
        const designerState = {
            activeRoom: "house-kucuk",
            activePaletteCat: "all",
            paletteQuery: "",
            placedItems: [],
            selectedItem: null,
            draggedItem: null,
            dragOffset: { x: 0, y: 0 },
            nextZ: 10,
            zoom: 1.0,
            panX: 0,
            panY: 0
        };

        const roomBlueprints = {
            "house-kucuk": { name: "Küçük Oda", src: "./img/houses/house_kucuk_oda_trans.png" },
            "house-orta": { name: "Orta Boy Oda", src: "./img/houses/house_orta_oda_trans.png" },
            "house-buyuk": { name: "Büyük Oda", src: "./img/houses/house_buyuk_oda_trans.png" },
            "house-teras": { name: "Teras Katı", src: "./img/houses/house_teras_kati_trans.png" }
        };

        // Yakınlık & Gezinti (Zoom & Pan) Motoru
        function updateWorldTransform() {
            if (!world) return;
            world.style.transform = `translate(${designerState.panX}px, ${designerState.panY}px) scale(${designerState.zoom})`;
            if (zoomValText) {
                zoomValText.textContent = `%${Math.round(designerState.zoom * 100)}`;
            }
        }

        function setZoom(newZoom) {
            designerState.zoom = Math.max(0.5, Math.min(2.5, Number(newZoom.toFixed(2))));
            updateWorldTransform();
        }

        function resetZoom() {
            designerState.zoom = 1.0;
            designerState.panX = 0;
            designerState.panY = 0;
            updateWorldTransform();
        }

        function fitZoom() {
            if (!viewport) return;
            const vpRect = viewport.getBoundingClientRect();
            const scaleX = (vpRect.width - 40) / 960;
            const scaleY = (vpRect.height - 40) / 680;
            const fitScale = Math.min(scaleX, scaleY, 1.25);
            designerState.zoom = Math.max(0.5, Math.min(2.5, Number(fitScale.toFixed(2))));
            designerState.panX = 0;
            designerState.panY = 0;
            updateWorldTransform();
        }

        if (zoomInBtn) zoomInBtn.addEventListener("click", () => setZoom(designerState.zoom + 0.15));
        if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => setZoom(designerState.zoom - 0.15));
        if (zoomResetBtn) zoomResetBtn.addEventListener("click", resetZoom);
        if (zoomFitBtn) zoomFitBtn.addEventListener("click", fitZoom);

        // Fare Tekerleği ile Tuvali Yakınlaştır / Uzaklaştır
        viewport.addEventListener("wheel", (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.12 : 0.88;
            setZoom(designerState.zoom * factor);
        }, { passive: false });

        // Tuval Arka Planından Sürükleyerek Gezinme (Pan)
        let isPanning = false;
        let panStartX = 0;
        let panStartY = 0;
        let startPanX = 0;
        let startPanY = 0;

        viewport.addEventListener("pointerdown", (e) => {
            if (e.target.closest(".placed-item") || e.target.closest(".canvas-zoom-toolbar") || e.target.closest(".gizmo-btn")) {
                return;
            }
            selectItem(null);
            isPanning = true;
            if (world) world.classList.add("is-panning");
            panStartX = e.clientX;
            panStartY = e.clientY;
            startPanX = designerState.panX;
            startPanY = designerState.panY;
            viewport.setPointerCapture(e.pointerId);
        });

        viewport.addEventListener("pointermove", (e) => {
            if (!isPanning) return;
            const dx = e.clientX - panStartX;
            const dy = e.clientY - panStartY;
            designerState.panX = startPanX + dx;
            designerState.panY = startPanY + dy;
            updateWorldTransform();
        });

        viewport.addEventListener("pointerup", (e) => {
            if (isPanning) {
                isPanning = false;
                if (world) world.classList.remove("is-panning");
                try { viewport.releasePointerCapture(e.pointerId); } catch(err) {}
            }
        });

        // Dışarıdan oda değişimini çağırmak için global referans
        window.designerSwitchRoom = function(roomId) {
            if (!roomBlueprints[roomId]) return;
            designerState.activeRoom = roomId;

            roomButtons.forEach(b => {
                if (b.getAttribute("data-room") === roomId) b.classList.add("active");
                else b.classList.remove("active");
            });

            blueprintImg.src = roomBlueprints[roomId].src;
            if (roomLabel) roomLabel.textContent = `Seçili Oda: ${roomBlueprints[roomId].name}`;
        };

        // Oda Seçici Butonları
        roomButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const r = btn.getAttribute("data-room");
                window.designerSwitchRoom(r);
            });
        });

        // Mobilya Boyut Kuralı
        function getFurnSize(furn) {
            const name = (furn.name || "").toLowerCase();
            const tr = (furn.trName || "").toLowerCase();
            const cat = furn.furnCategory || "";
            if (cat === "yatak-dolap" || name.includes("bed") || name.includes("couch") || name.includes("sofa") || name.includes("wardrobe") || name.includes("piano") || name.includes("billiards") || tr.includes("yatak") || tr.includes("koltuk") || tr.includes("dolap") || tr.includes("piyano") || tr.includes("bilardo")) {
                return "large";
            }
            if (name.includes("lamp") || name.includes("chair") || name.includes("stool") || name.includes("clock") || name.includes("plant") || name.includes("vase") || tr.includes("lamba") || tr.includes("sandalye") || tr.includes("tabure") || tr.includes("saat") || tr.includes("vazo") || tr.includes("çiçek") || tr.includes("bitki")) {
                return "small";
            }
            return "normal";
        }

        // Mobilya Paletini Render Et
        function renderPalette() {
            let furnList = MINIFAL_DATABASE.furniture || [];

            // Kategori filtreleme
            if (designerState.activePaletteCat !== "all") {
                furnList = furnList.filter(f => f.furnCategory === designerState.activePaletteCat);
            }

            // Arama filtreleme
            if (designerState.paletteQuery.trim()) {
                const q = designerState.paletteQuery.toLowerCase();
                furnList = furnList.filter(f =>
                    (f.name && f.name.toLowerCase().includes(q)) ||
                    (f.trName && f.trName.toLowerCase().includes(q)) ||
                    (f.description && f.description.toLowerCase().includes(q))
                );
            }

            const counter = document.getElementById("palette-counter");
            if (counter) counter.textContent = `${furnList.length} Eşya`;

            const container = document.getElementById("palette-items-list");
            if (!container) return;

            if (furnList.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; padding: 25px; text-align: center; color: var(--ink-dim); font-size: 13px;">
                        🔍 Aradığınız kriterde mobilya bulunamadı.
                    </div>
                `;
                return;
            }

            container.innerHTML = furnList.map(furn => {
                const isCrystal = furn.currency === "crystal";
                const priceBadge = isCrystal
                    ? `<span class="furn-price crystal">💎 ${furn.price} Crystal</span>`
                    : `<span class="furn-price cash">🪙 ${furn.price.toLocaleString("tr-TR")} Cash</span>`;

                return `
                    <div class="palette-card" data-furn-id="${furn.id}" title="${furn.name} - Tuvale eklemek için tıklayın">
                        <div class="palette-card-thumb">
                            <img src="${furn.image}" alt="${furn.name}" loading="lazy">
                        </div>
                        <div class="palette-card-body">
                            <span class="furn-title">${furn.name}</span>
                            <span class="furn-sub">${furn.subType || "Mobilya"}</span>
                            <div class="furn-meta-row">
                                ${priceBadge}
                                <button type="button" class="btn-palette-add" data-id="${furn.id}" title="Odaya Ekle">➕ Ekle</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join("");

            container.querySelectorAll(".palette-card").forEach(card => {
                card.addEventListener("click", () => {
                    const fId = card.getAttribute("data-furn-id");
                    addFurnitureToStage(fId);
                });
            });

            container.querySelectorAll(".btn-palette-add").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const fId = btn.getAttribute("data-id");
                    addFurnitureToStage(fId);
                });
            });
        }

        // Kategori Hapları Dinleyicisi
        const pCatPills = document.querySelectorAll("#palette-cat-pills .p-cat-btn");
        pCatPills.forEach(btn => {
            btn.addEventListener("click", () => {
                pCatPills.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                designerState.activePaletteCat = btn.getAttribute("data-pcat");
                renderPalette();
            });
        });

        // Arama Çubuğu Dinleyicisi
        const pSearch = document.getElementById("palette-search");
        if (pSearch) {
            pSearch.addEventListener("input", (e) => {
                designerState.paletteQuery = e.target.value;
                renderPalette();
            });
        }

        // Sahneye Yeni Mobilya Ekle (960x680 koordinat sistemi)
        function addFurnitureToStage(furnId, customX = null, customY = null, flipped = false) {
            const furn = (MINIFAL_DATABASE.furniture || []).find(f => f.id === furnId);
            if (!furn) return;

            const defaultX = customX !== null ? customX : Math.round(480 - 25 + (Math.random() * 60 - 30));
            const defaultY = customY !== null ? customY : Math.round(340 - 25 + (Math.random() * 60 - 30));

            const instanceId = "placed-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
            designerState.nextZ += 1;

            const placedObj = {
                id: instanceId,
                furnId: furn.id,
                name: furn.name,
                trName: furn.trName,
                price: furn.price,
                currency: furn.currency,
                image: furn.image,
                x: defaultX,
                y: defaultY,
                flipped: flipped,
                scale: 1.0,
                furnSize: getFurnSize(furn),
                zIndex: designerState.nextZ
            };

            designerState.placedItems.push(placedObj);
            renderPlacedItemDom(placedObj);
            updateBudget();
            selectItem(instanceId);
        }

        // Yerleştirilen Eşyanın DOM Elemanını Oluştur
        function renderPlacedItemDom(item) {
            const el = document.createElement("div");
            el.className = "placed-item";
            el.id = item.id;
            el.setAttribute("data-furn-size", item.furnSize || "normal");
            el.style.left = `${item.x}px`;
            el.style.top = `${item.y}px`;
            el.style.zIndex = item.zIndex;
            el.style.transform = `${item.flipped ? "scaleX(-1)" : "scaleX(1)"} scale(${item.scale || 1.0})`;

            el.innerHTML = `
                <div class="placed-item-gizmo">
                    <button type="button" class="gizmo-btn gizmo-btn--flip" title="Döndür / Çevir">🔄</button>
                    <button type="button" class="gizmo-btn gizmo-btn--grow" title="Büyüt">➕</button>
                    <button type="button" class="gizmo-btn gizmo-btn--shrink" title="Küçült">➖</button>
                    <button type="button" class="gizmo-btn gizmo-btn--up" title="Öne Getir">⬆️</button>
                    <button type="button" class="gizmo-btn gizmo-btn--down" title="Arkaya Gönder">⬇️</button>
                    <button type="button" class="gizmo-btn gizmo-btn--del" title="Sil">🗑️</button>
                </div>
                <img src="${item.image}" alt="${item.name}">
            `;

            const flipBtn = el.querySelector(".gizmo-btn--flip");
            const growBtn = el.querySelector(".gizmo-btn--grow");
            const shrinkBtn = el.querySelector(".gizmo-btn--shrink");
            const upBtn = el.querySelector(".gizmo-btn--up");
            const downBtn = el.querySelector(".gizmo-btn--down");
            const delBtn = el.querySelector(".gizmo-btn--del");

            flipBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                item.flipped = !item.flipped;
                el.style.transform = `${item.flipped ? "scaleX(-1)" : "scaleX(1)"} scale(${item.scale || 1.0})`;
            });

            growBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                item.scale = Math.min(2.0, (item.scale || 1.0) + 0.15);
                el.style.transform = `${item.flipped ? "scaleX(-1)" : "scaleX(1)"} scale(${item.scale})`;
            });

            shrinkBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                item.scale = Math.max(0.6, (item.scale || 1.0) - 0.15);
                el.style.transform = `${item.flipped ? "scaleX(-1)" : "scaleX(1)"} scale(${item.scale})`;
            });

            upBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                designerState.nextZ += 1;
                item.zIndex = designerState.nextZ;
                el.style.zIndex = item.zIndex;
            });

            downBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                item.zIndex = Math.max(1, item.zIndex - 1);
                el.style.zIndex = item.zIndex;
            });

            delBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                removePlacedItem(item.id);
            });

            // Tıklama ve Sürükleme Başlatma (Zoom uyumlu)
            el.addEventListener("pointerdown", (e) => {
                if (e.target.closest(".placed-item-gizmo")) return;
                e.stopPropagation();

                selectItem(item.id);
                designerState.draggedItem = item;
                const rect = el.getBoundingClientRect();
                designerState.dragOffset = {
                    x: (e.clientX - rect.left) / designerState.zoom,
                    y: (e.clientY - rect.top) / designerState.zoom
                };

                el.setPointerCapture(e.pointerId);
            });

            el.addEventListener("pointermove", (e) => {
                if (designerState.draggedItem && designerState.draggedItem.id === item.id) {
                    const worldRect = (world || stage).getBoundingClientRect();
                    let newX = (e.clientX - worldRect.left) / designerState.zoom - designerState.dragOffset.x;
                    let newY = (e.clientY - worldRect.top) / designerState.zoom - designerState.dragOffset.y;

                    newX = Math.max(10, Math.min(newX, 960 - 50));
                    newY = Math.max(10, Math.min(newY, 680 - 50));

                    item.x = Math.round(newX);
                    item.y = Math.round(newY);

                    el.style.left = `${item.x}px`;
                    el.style.top = `${item.y}px`;
                }
            });

            el.addEventListener("pointerup", (e) => {
                if (designerState.draggedItem && designerState.draggedItem.id === item.id) {
                    designerState.draggedItem = null;
                    try { el.releasePointerCapture(e.pointerId); } catch(err) {}
                }
            });

            stage.appendChild(el);
        }

        function selectItem(instanceId) {
            designerState.selectedItem = instanceId;
            stage.querySelectorAll(".placed-item").forEach(el => {
                if (el.id === instanceId) el.classList.add("is-selected");
                else el.classList.remove("is-selected");
            });
        }

        function removePlacedItem(instanceId) {
            const idx = designerState.placedItems.findIndex(i => i.id === instanceId);
            if (idx !== -1) {
                designerState.placedItems.splice(idx, 1);
            }
            const el = document.getElementById(instanceId);
            if (el) el.remove();
            if (designerState.selectedItem === instanceId) designerState.selectedItem = null;
            updateBudget();
        }

        // Bütçe ve Maliyet Hesaplayıcı
        function updateBudget() {
            let totalCash = 0;
            let totalCrystal = 0;

            designerState.placedItems.forEach(item => {
                if (item.currency === "crystal") {
                    totalCrystal += (item.price || 0);
                } else {
                    totalCash += (item.price || 0);
                }
            });

            const cashEl = document.getElementById("designer-cost-cash");
            const cryEl = document.getElementById("designer-cost-crystal");
            const countSpan = document.getElementById("designer-item-count");

            if (cashEl) cashEl.textContent = `${totalCash.toLocaleString("tr-TR")} Cash`;
            if (cryEl) cryEl.textContent = `${totalCrystal} Crystal`;
            if (countSpan) countSpan.textContent = `${designerState.placedItems.length} Eşya`;
        }

        // Temizle Butonu
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                if (designerState.placedItems.length === 0) return;
                if (confirm("Odadaki tüm mobilyaları kaldırmak istediğinize emin misiniz?")) {
                    designerState.placedItems = [];
                    designerState.selectedItem = null;
                    stage.innerHTML = "";
                    updateBudget();
                }
            });
        }

        // Örnek Yerleşim Yükleyici
        if (sampleBtn) {
            sampleBtn.addEventListener("click", () => {
                stage.innerHTML = "";
                designerState.placedItems = [];
                designerState.selectedItem = null;

                // Seçili odaya göre zengin örnek yerleşim (960x680 orantılı koordinatlar)
                if (designerState.activeRoom === "house-kucuk") {
                    addFurnitureToStage("furn-single-bed", 280, 360);
                    addFurnitureToStage("furn-small-nightstand", 360, 390);
                    addFurnitureToStage("furn-desk-lamp", 365, 365);
                    addFurnitureToStage("furn-simple-large-rug", 470, 350);
                    addFurnitureToStage("furn-classic-armchair", 540, 340);
                    addFurnitureToStage("furn-32-lcd-tv", 580, 270);
                    addFurnitureToStage("furn-fridge", 670, 370);
                } else if (designerState.activeRoom === "house-orta") {
                    addFurnitureToStage("furn-double-bed", 260, 370);
                    addFurnitureToStage("furn-nightstand-tray", 350, 400);
                    addFurnitureToStage("furn-bookshelves", 380, 260);
                    addFurnitureToStage("furn-classic-large-couch", 490, 320);
                    addFurnitureToStage("furn-double-coffee-table", 510, 380);
                    addFurnitureToStage("furn-thin-floor-lamp", 440, 290);
                    addFurnitureToStage("furn-42-lcd-tv", 620, 270);
                    addFurnitureToStage("furn-audio-system", 690, 300);
                } else if (designerState.activeRoom === "house-buyuk") {
                    addFurnitureToStage("furn-double-bed", 220, 340);
                    addFurnitureToStage("furn-large-wardrobe", 180, 260);
                    addFurnitureToStage("furn-striped-med-rug", 460, 370);
                    addFurnitureToStage("furn-fancy-large-couch", 460, 310);
                    addFurnitureToStage("furn-fancy-armchair", 390, 410);
                    addFurnitureToStage("furn-52-lcd-tv", 570, 240);
                    addFurnitureToStage("furn-high-speaker", 640, 250);
                    addFurnitureToStage("furn-large-dinner-table", 650, 410);
                    addFurnitureToStage("furn-deck-chair", 230, 480);
                } else {
                    // Teras Katı
                    addFurnitureToStage("furn-double-bed", 260, 310);
                    addFurnitureToStage("furn-transparent-large-couch", 480, 310);
                    addFurnitureToStage("furn-transparent-armchair", 420, 390);
                    addFurnitureToStage("furn-52-lcd-tv", 580, 220);
                    addFurnitureToStage("furn-piano", 710, 290);
                    addFurnitureToStage("furn-billiards-table", 670, 460);
                    addFurnitureToStage("furn-small-fountain", 460, 520);
                    addFurnitureToStage("furn-trampoline", 280, 490);
                }
            });
        }

        // Tasarımı Kaydet (LocalStorage)
        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                const savePayload = {
                    room: designerState.activeRoom,
                    items: designerState.placedItems.map(i => ({
                        furnId: i.furnId,
                        x: i.x,
                        y: i.y,
                        flipped: i.flipped,
                        scale: i.scale || 1.0,
                        zIndex: i.zIndex
                    }))
                };
                try {
                    localStorage.setItem("minifal_room_layout_" + designerState.activeRoom, JSON.stringify(savePayload));
                    alert(`✅ "${roomBlueprints[designerState.activeRoom].name}" için tasarımınız başarıyla tarayıcınıza kaydedildi!`);
                } catch(e) {
                    alert("❌ Kaydedilirken bir hata oluştu.");
                }
            });
        }

        // Tasarımı Geri Yükle (LocalStorage)
        if (loadBtn) {
            loadBtn.addEventListener("click", () => {
                try {
                    const raw = localStorage.getItem("minifal_room_layout_" + designerState.activeRoom);
                    if (!raw) {
                        alert(`ℹ️ "${roomBlueprints[designerState.activeRoom].name}" için kayıtlı bir tasarım bulunamadı.`);
                        return;
                    }
                    const data = JSON.parse(raw);
                    stage.innerHTML = "";
                    designerState.placedItems = [];
                    designerState.selectedItem = null;

                    if (Array.isArray(data.items)) {
                        data.items.forEach(it => {
                            addFurnitureToStage(it.furnId, it.x, it.y, it.flipped);
                        });
                    }
                    alert(`📂 "${roomBlueprints[designerState.activeRoom].name}" tasarımı başarıyla yüklendi!`);
                } catch(e) {
                    alert("❌ Tasarım yüklenirken hata oluştu.");
                }
            });
        }

        // Başlangıç: Paleti doldur ve başlangıç örnek yerleşimini yükle
        renderPalette();
        updateWorldTransform();

        // Sayfa ilk açıldığında odaya starter örnek mobilya yerleşimi koy
        if (stage.children.length === 0) {
            setTimeout(() => {
                if (sampleBtn) sampleBtn.click();
            }, 100);
        }
    }


        window.addEventListener("resize", () => {
        renderChart();
    });

    // Başlangıç Çalıştırması
    if (state.activeCategory !== "all") {
        updateActiveCategoryButton(state.activeCategory);
    }
    populateChartSelect();
    renderChart();
    renderMarketTable();
    renderCards();
    initBossCalculator();
    renderHaritaAndLocations();
    initPaintballModal();
    initFootballModal();
    initTennisModal();
    renderVendors();
    renderHouses();
    initRoomDesigner();
});
