import fs from "fs";
import path from "path";

const bashScript = `
#!/bin/bash

set -u

echo "Consultando StatefulSets..." >&2

mapfile -t STATEFULSETS < <(
    kubectl get statefulsets -A \\
        -o jsonpath='{range .items[*]}{.metadata.namespace}{"|"}{.metadata.name}{"\\n"}{end}'
)

for entry in "\${STATEFULSETS[@]}"; do

    namespace="\${entry%%|*}"
    statefulset="\${entry#*|}"

    echo "Procesando $namespace / $statefulset" >&2

    nfs_volumes="$(
        kubectl get statefulset "$statefulset" \\
            -n "$namespace" \\
            -o go-template='{{range .spec.template.spec.volumes}}{{if .nfs}}{{printf "%s\\t%s\\t%s\\n" .name .nfs.server .nfs.path}}{{end}}{{end}}'
    )"

    if [[ -z "$nfs_volumes" ]]; then

        printf 'NO_NFS\\t%s\\t%s\\n' \\
            "$namespace" \\
            "$statefulset"

    else

        while IFS=$'\\t' read -r volume server path; do

            printf 'NFS_RECORD\\t%s\\t%s\\t%s\\t%s\\t%s\\n' \\
                "$namespace" \\
                "$statefulset" \\
                "$volume" \\
                "$server" \\
                "$path"

        done <<< "$nfs_volumes"

    fi

done
`;

const result = await runBashOverDoubleSsh(
    jumpHost,
    targetHost,
    bashScript
);
--------------------------------------------------------------------
if (result.exitCode !== 0) {
    console.error("Error ejecutando el script remoto:");
    console.error(result.stderr);

    throw new Error(
        `El script remoto terminó con código ${result.exitCode}`
    );
}

console.log("Consulta Kubernetes terminada correctamente.");

if (result.stderr) {
    console.log(result.stderr);
}
-------------------------------------------------------------------------
interface NfsRecord {
    namespace: string;
    statefulSet: string;
    volume: string;
    server: string;
    path: string;
    hasNfs: boolean;
}
---------------------------------------------------------------------
function parseNfsOutput(stdout: string): NfsRecord[] {

    const records: NfsRecord[] = [];

    const lines = stdout
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);

    for (const line of lines) {

        const fields = line.split("\t");

        const type = fields[0];

        if (type === "NFS_RECORD") {

            const [
                ,
                namespace,
                statefulSet,
                volume,
                server,
                nfsPath
            ] = fields;

            records.push({
                namespace,
                statefulSet,
                volume,
                server,
                path: nfsPath,
                hasNfs: true
            });

        }

        if (type === "NO_NFS") {

            const [
                ,
                namespace,
                statefulSet
            ] = fields;

            records.push({
                namespace,
                statefulSet,
                volume: "",
                server: "",
                path: "",
                hasNfs: false
            });

        }
    }

    return records;
}
-----------------
const records = parseNfsOutput(result.stdout);
--------------------------------
  function escapeHtml(value: string): string {

    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
---------------
function generateHtmlReport(records: NfsRecord[]): string {

    const statefulSets = new Set(
        records.map(record =>
            `${record.namespace}/${record.statefulSet}`
        )
    );

    const nfsVolumes =
        records.filter(record => record.hasNfs).length;

    const withoutNfs =
        new Set(
            records
                .filter(record => !record.hasNfs)
                .map(record =>
                    `${record.namespace}/${record.statefulSet}`
                )
        ).size;


    const rows = records
        .map(record => {

            if (!record.hasNfs) {

                return `
                    <tr class="without-nfs">
                        <td>${escapeHtml(record.namespace)}</td>

                        <td>
                            ${escapeHtml(record.statefulSet)}
                        </td>

                        <td class="empty">
                            —
                        </td>

                        <td>
                            <span class="badge badge-no">
                                Sin NFS
                            </span>
                        </td>

                        <td class="empty">
                            —
                        </td>
                    </tr>
                `;
            }

            return `
                <tr>
                    <td>
                        ${escapeHtml(record.namespace)}
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(record.statefulSet)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(record.volume)}
                    </td>

                    <td>
                        <span class="server">
                            ${escapeHtml(record.server)}
                        </span>
                    </td>

                    <td>
                        <code>
                            ${escapeHtml(record.path)}
                        </code>
                    </td>
                </tr>
            `;

        })
        .join("");


    return `
<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
/>

<title>
    Kubernetes NFS Report
</title>


<style>

* {
    box-sizing: border-box;
}

body {

    margin: 0;

    font-family:
        Inter,
        Arial,
        Helvetica,
        sans-serif;

    background: #f4f7fb;

    color: #1f2937;
}


/* HEADER */

.header {

    background:
        linear-gradient(
            135deg,
            #172554,
            #1e40af
        );

    color: white;

    padding:
        32px
        50px;
}


.header h1 {

    margin: 0;

    font-size: 28px;
}


.header p {

    margin:
        8px
        0
        0;

    opacity: .8;
}


/* CONTAINER */

.container {

    max-width: 1500px;

    margin:
        30px
        auto;

    padding:
        0
        25px;
}


/* SUMMARY */

.summary {

    display: grid;

    grid-template-columns:
        repeat(
            auto-fit,
            minmax(200px, 1fr)
        );

    gap: 20px;

    margin-bottom: 30px;
}


.card {

    background: white;

    padding: 22px;

    border-radius: 12px;

    box-shadow:
        0 3px 10px
        rgba(0,0,0,.06);

    border:
        1px
        solid
        #e5e7eb;
}


.card-title {

    color: #6b7280;

    font-size: 13px;

    text-transform: uppercase;

    letter-spacing: .5px;
}


.card-value {

    font-size: 30px;

    font-weight: bold;

    margin-top: 8px;

    color: #172554;
}


/* TABLE */

.table-container {

    background: white;

    border-radius: 12px;

    overflow: hidden;

    box-shadow:
        0 3px 10px
        rgba(0,0,0,.06);

    border:
        1px
        solid
        #e5e7eb;
}


table {

    width: 100%;

    border-collapse: collapse;
}


thead {

    background: #172554;

    color: white;
}


th {

    padding:
        15px
        18px;

    text-align: left;

    font-size: 13px;

    text-transform: uppercase;

    letter-spacing: .4px;
}


td {

    padding:
        14px
        18px;

    border-bottom:
        1px
        solid
        #e5e7eb;

    vertical-align: middle;
}


tbody tr:hover {

    background: #f8fafc;
}


tbody tr:last-child td {

    border-bottom: none;
}


/* NFS */

.server {

    font-family:
        monospace;

    background: #eff6ff;

    color: #1d4ed8;

    padding:
        5px
        8px;

    border-radius: 5px;
}


code {

    background: #f3f4f6;

    padding:
        5px
        8px;

    border-radius: 5px;

    color: #374151;
}


/* BADGES */

.badge {

    display: inline-block;

    padding:
        5px
        9px;

    border-radius: 20px;

    font-size: 12px;

    font-weight: 600;
}


.badge-no {

    background: #fee2e2;

    color: #991b1b;
}


.without-nfs {

    background: #fafafa;

    color: #6b7280;
}


.empty {

    color: #9ca3af;
}


/* FOOTER */

.footer {

    text-align: center;

    margin:
        30px
        0;

    color: #6b7280;

    font-size: 13px;
}


@media
(max-width: 800px) {

    .header {

        padding:
            25px;
    }

    .container {

        padding:
            0
            12px;
    }

    .table-container {

        overflow-x: auto;
    }

    table {

        min-width: 800px;
    }

}

</style>

</head>


<body>


<div class="header">

    <h1>
        Kubernetes NFS Inventory
    </h1>

    <p>
        StatefulSets y volúmenes NFS encontrados
        en el cluster
    </p>

</div>


<div class="container">


<div class="summary">

    <div class="card">

        <div class="card-title">
            StatefulSets
        </div>

        <div class="card-value">
            ${statefulSets.size}
        </div>

    </div>


    <div class="card">

        <div class="card-title">
            Volúmenes NFS
        </div>

        <div class="card-value">
            ${nfsVolumes}
        </div>

    </div>


    <div class="card">

        <div class="card-title">
            StatefulSets sin NFS directo
        </div>

        <div class="card-value">
            ${withoutNfs}
        </div>

    </div>

</div>


<div class="table-container">

<table>

<thead>

<tr>

    <th>
        Namespace
    </th>

    <th>
        StatefulSet
    </th>

    <th>
        Volume
    </th>

    <th>
        NFS Server
    </th>

    <th>
        NFS Path
    </th>

</tr>

</thead>


<tbody>

${rows}

</tbody>


</table>

</div>


<div class="footer">

Reporte generado:

${new Date().toLocaleString()}

</div>


</div>


</body>

</html>
`;
}
-----------------------------
const records =
    parseNfsOutput(result.stdout);

const html =
    generateHtmlReport(records);

const reportPath =
    path.resolve(
        process.cwd(),
        "kubernetes-nfs-report.html"
    );

fs.writeFileSync(
    reportPath,
    html,
    "utf8"
);

console.log(
    `Reporte generado correctamente: ${reportPath}`
);  
