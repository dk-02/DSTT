import {
    DropdownRoot,
    DropdownPopover,
    DropdownMenu,
    DropdownSection,
    DropdownItem,
    DropdownSeparator,
    DropdownDotsButton
} from "../base/dropdown/dropdown";
import { FilterLines } from "@untitledui/icons";

interface FilterDropdownProps {
    onFilterChange: (type: "all" | "active" | "inactive" | "admin" | "examinee" | "expert" | "teacher") => void;
}

export const FilterDropdown = ({ onFilterChange }: FilterDropdownProps) => (
    <DropdownRoot>
        <div className="flex relative items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-all border border-gray-600">
            <FilterLines className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium">Filtriraj</span>
            <DropdownDotsButton className=" absolute inset-0 w-full h-full" /> 
        </div>

        <DropdownPopover className="w-56 bg-gray-800 text-gray-100 border border-gray-700 shadow-2xl">
            <DropdownMenu>
                <DropdownSection>
                    <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Status
                    </div>
                    <DropdownItem onAction={() => onFilterChange("all")}>Svi korisnici</DropdownItem>
                    <DropdownItem onAction={() => onFilterChange("active")}>Samo aktivni</DropdownItem>
                    <DropdownItem onAction={() => onFilterChange("inactive")}>Samo neaktivni</DropdownItem>
                </DropdownSection>

                <DropdownSeparator className="bg-gray-700" />

                <DropdownSection>
                    <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Uloge
                    </div>
                    <DropdownItem onAction={() => onFilterChange("admin")}>Administratori</DropdownItem>
                    <DropdownItem onAction={() => onFilterChange("examinee")}>Ispitanici (Studenti)</DropdownItem>
                    <DropdownItem onAction={() => onFilterChange("expert")}>Ispitanici (Studenti)</DropdownItem>
                    <DropdownItem onAction={() => onFilterChange("teacher")}>Ispitanici (Studenti)</DropdownItem>
                </DropdownSection>
            </DropdownMenu>
        </DropdownPopover>
    </DropdownRoot>
);