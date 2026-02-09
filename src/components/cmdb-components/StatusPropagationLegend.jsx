import { Info, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

/**
 * StatusPropagationLegend - Komponen untuk menjelaskan status propagation
 */
export default function StatusPropagationLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md">
          <Info size={18} />
          <span className="text-sm font-medium">Status Info</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-4">
          <div className="border-b pb-2">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Info size={20} className="text-blue-600" />
              Status Propagation
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Status dari node bermasalah akan merambat ke semua node yang terhubung
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-green-100 flex-shrink-0">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Active</p>
                <p className="text-xs text-muted-foreground">
                  Node berfungsi normal, koneksi berwarna hijau
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-yellow-100 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Maintenance</p>
                <p className="text-xs text-muted-foreground">
                  Node dalam maintenance, koneksi berwarna kuning/orange dan merambat ke semua dependent nodes
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-red-100 flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Inactive / Decommissioned</p>
                <p className="text-xs text-muted-foreground">
                  Node tidak aktif, koneksi berwarna merah dengan tanda ✕ dan merambat ke semua dependent nodes
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-2">Cara Kerja Propagasi:</h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Node dengan status bermasalah (maintenance/inactive/decommissioned) menjadi sumber propagasi</li>
              <li>Semua koneksi keluar dari node tersebut akan mengambil warna statusnya</li>
              <li>Status merambat secara recursive ke semua node yang terhubung (dependencies)</li>
              <li>Jika ada multiple sources bermasalah, diambil status terburuk (inactive &gt; maintenance &gt; active)</li>
              <li>Propagasi ditandai dengan label "(propagated)" pada koneksi</li>
            </ol>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-blue-600" />
              Contoh Skenario:
            </h4>
            <div className="bg-blue-50 p-3 rounded text-xs space-y-2">
              <p>
                <strong>Server A</strong> (inactive) → <strong>Server B</strong> → <strong>Server C</strong>
              </p>
              <p className="text-muted-foreground">
                Jika Server A inactive, maka:
                <br />• Koneksi A→B akan merah dengan ✕
                <br />• Koneksi B→C juga akan merah dengan ✕ (propagated)
                <br />• Server C terpengaruh oleh status Server A meski tidak langsung terhubung
              </p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}