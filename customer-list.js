        return `
        <div class="cust-card" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; gap: 12px; align-items: center;">
                <img src="${cust.customerPhoto || 'https://via.placeholder.com/55'}" class="cust-avatar">
                
                <div class="cust-info" style="flex: 1;">
                    <h4 style="margin: 0 0 4px 0; font-size: 16px; color: #0f172a;">${cust.name} (${displayCode})</h4>
                    <p style="margin: 0 0 2px 0; font-size: 12px; color: #64748b;">📞 ${cust.mobile || 'N/A'}</p>
                    <p style="margin: 0 0 2px 0; font-size: 12px; color: #64748b;">📅 Date: ${cust.loanDate} | <span style="color:#ef4444; font-weight:bold;">Due: ₹${currentOD}</span></p>
                </div>
            </div>
            
            <div class="cust-actions" style="display: flex; flex-direction: row; gap: 6px; width: 100%; margin-top: 5px;">
                <a href="${collectUrl}" class="btn-action" style="background: #28a745; color: white; flex: 1; padding: 10px; border-radius: 6px; font-size: 12px; font-weight: bold; text-decoration: none; text-align: center;">Collect EMI</a>
                <button onclick="secureEdit('${cust.id}')" class="btn-action btn-edit" style="background: #ffb703; color: black; flex: 1; padding: 10px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; border: none;">Edit</button>
                <button onclick="secureDelete('${cust.id}')" class="btn-action btn-delete" style="background: #ef4444; color: white; flex: 1; padding: 10px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; border: none;">Del</button>
            </div>
        </div>
        `;
