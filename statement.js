                    <td>${collect.date || "-"}</td>
                    <td><strong>₹${collect.amount || 0}</strong></td>
                    <td><button class="delete-btn" data-id="${docSnap.id}">❌</button></td>
                `;
                collectionTableBody.appendChild(tr);
            });

        } catch (error) {
            console.error("कलेशन हिस्ट्री लोड करने में एरर:", error);
            collectionTableBody.innerHTML = `<tr><td colspan="4" style="color:red;">इतिहास लोड करने में समस्या आई।</td></tr>`;
        }
    }

    // प्रिंट और व्हाट्सएप शेयर के बटन्स
    const printBtn = document.getElementById("printBtn");
    if (printBtn) {
        printBtn.onclick = () => window.print();
    }

    const whatsappBtn = document.getElementById("whatsappBtn");
    if (whatsappBtn) {
        whatsappBtn.onclick = () => {
            const text = `🏦 *GDA Finance Services*\n*Statement*\n\n👤 नाम: ${lblName.textContent}\n🆔 ID: ${lblId.textContent}\n🗓️ लोन तारीख: ${lblDate.textContent}\n💰 शेष बकाया: ${lblRemaining.textContent}`;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
        };
    }

    // रन करें
    await loadCustomerStatement();
});
