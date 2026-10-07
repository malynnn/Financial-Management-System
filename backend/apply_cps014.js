const fs = require('fs');

let fileContent = fs.readFileSync('../components/collections/AuditHistoryModal.tsx', 'utf8');

// 1. Update the interface
fileContent = fileContent.replace(
  /interface AuditLog \{[\s\S]*?details: string;\n\}/,
  `interface AuditLog {
  id: string;
  action: string;
  actor: string;
  role: string;
  timestamp: string;
  details: string;
  userId?: string;
  collectionRefNo?: string;
  previousStatus?: string;
  newStatus?: string;
}`
);

// 2. Update handleExportLog
fileContent = fileContent.replace(
  /collection\.auditTrail\.map\(log => [\s\S]*?`\[\$\{new Date\(log\.timestamp\)\.toLocaleString\('en-US', \{ timeZone: 'Asia\/Manila' \}\)\] \$\{log\.action\}\\nDetails: \$\{log\.details\}\\nActor: \$\{log\.actor\} \(\$\{log\.role\}\)\\n`\n\s*\)/,
  `collection.auditTrail.map(log => 
        \`[\${new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}] \${log.action}\\nDetails: \${log.details}\\nActor: \${log.actor} (\${log.role})\\nUser ID: \${log.userId || 'N/A'}\\nReference: \${log.collectionRefNo || 'N/A'}\\nStatus Change: \${log.previousStatus || 'None'} -> \${log.newStatus || 'N/A'}\\n\`
      )`
);

// 3. Update the timeline UI - below the action title and time
fileContent = fileContent.replace(
  /<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">[\s\S]*?<\/div>\n\s*<p className="text-\[12px\] text-\[#04152d\]\/70 mb-3 leading-relaxed">\{log\.details\}<\/p>/,
  `<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="text-[13px] font-semibold text-[#04152d]">{log.action}</span>
                        <div className="flex items-center gap-1 text-[11px] font-medium text-[#04152d]/50 font-mono">
                          <Clock size={12} />
                          {new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      {log.newStatus && (
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-[10px] uppercase tracking-wider text-blue-600/70 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            Status: {log.previousStatus || 'None'} → {log.newStatus}
                          </span>
                          {log.collectionRefNo && (
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              Ref: {log.collectionRefNo}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <p className="text-[12px] text-[#04152d]/70 mb-3 leading-relaxed">{log.details}</p>`
);

// 4. Update the footer (where Actor is rendered)
fileContent = fileContent.replace(
  /<span className="px-1\.5 py-0\.5 bg-\[#04152d\]\/5 rounded text-\[#04152d\]\/60 uppercase tracking-widest text-\[9px\] ml-1 border border-white\/80">\{log\.role\}<\/span>\n\s*<\/div>/,
  `<span className="px-1.5 py-0.5 bg-[#04152d]/5 rounded text-[#04152d]/60 uppercase tracking-widest text-[9px] ml-1 border border-white/80">{log.role}</span>
                        {log.userId && (
                          <span className="text-[10px] text-[#04152d]/40 ml-2 border-l border-white/60 pl-2">
                            User ID: <span className="font-mono">{log.userId}</span>
                          </span>
                        )}
                      </div>`
);

fs.writeFileSync('../components/collections/AuditHistoryModal.tsx', fileContent);
console.log('Successfully updated AuditHistoryModal.tsx');
