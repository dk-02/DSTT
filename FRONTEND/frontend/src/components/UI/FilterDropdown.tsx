import {
    DropdownRoot,
    DropdownPopover,
    DropdownMenu,
    DropdownSection,
    DropdownItem,
    DropdownSeparator,
    DropdownDotsButton,
    DropdownSectionHeader
} from "../base/dropdown/dropdown";
import { Check, FilterLines, Trash01 } from "@untitledui/icons";


type FilterType = "all" | "active" | "inactive" | "admin" | "examinee" | "expert" | "teacher";

interface Filters {
    status: string;
    role: string;
}

interface FilterDropdownProps {
    filters: Filters;
    onFilterChange: (category: "status" | "role", value: FilterType) => void;
    onClearAll: () => void;
}

export const FilterDropdown = ({ onFilterChange, filters, onClearAll }: FilterDropdownProps) => {
    const activeFiltersCount = (filters.status !== "all" ? 1 : 0) + (filters.role !== "all" ? 1 : 0);

    const renderDropdownItem = (category: "status" | "role", value: FilterType, label: string) => {
        const isActive = filters[category] === value;
        
        return (
            <DropdownItem className={`${isActive && 'rounded-md mx-1.5 my-1 bg-gray-700 px-0'}`} onAction={() => onFilterChange(category, value)}>
                <div className={`flex justify-between items-center w-full ${isActive ? 'font-bold' : 'text-gray-300'}`}>
                    <span>{label}</span>
                    {isActive && <Check className="w-4 h-4 text-orange-400" />}
                </div>
            </DropdownItem>
        );
    };

    return(
        <div className="relative">
            <DropdownRoot>
                <div className="flex relative items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-all border border-gray-600">
                    <FilterLines className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">Filtriraj</span>
                    {activeFiltersCount > 0 && 
                        <div className="flex items-center justify-center bg-orange-400 text-white text-xs font-bold w-5 h-5 rounded-full ml-1">
                            {activeFiltersCount}
                        </div>
                    }
                    <DropdownDotsButton className="opacity-0 absolute inset-0 w-full h-full" /> 
                </div>

                <DropdownPopover className="absolute right-0 mt-2 z-50 w-56 bg-gray-800 text-gray-100 border border-gray-700 shadow-2xl rounded-lg">
                    <DropdownMenu>
                        <DropdownSection>                            
                            <DropdownSectionHeader className="px-4 pt-1.5 pb-0.5 text-xs font-semibold text-orange-400">Status</DropdownSectionHeader>
                            {renderDropdownItem("status", "all", "Svi statusi")}
                            {renderDropdownItem("status", "active", "Samo aktivni")}
                            {renderDropdownItem("status", "inactive", "Samo neaktivni")}
                        </DropdownSection>

                        <DropdownSeparator className="bg-gray-700" />

                        <DropdownSection>
                            <DropdownSectionHeader className="px-4 pt-1.5 pb-0.5 text-xs font-semibold text-orange-400">Uloge</DropdownSectionHeader>
                            {renderDropdownItem("role", "all", "Sve uloge")}
                            {renderDropdownItem("role", "admin", "Administratori")}
                            {renderDropdownItem("role", "examinee", "Ispitanici")}
                            {renderDropdownItem("role", "expert", "Stručnjaci")}
                            {renderDropdownItem("role", "teacher", "Nastavnici")}
                        </DropdownSection>

                        {activeFiltersCount > 0 && (
                            <>
                                <DropdownSeparator className="bg-gray-700" />
                                <DropdownSection className="p-1">
                                    <DropdownItem onAction={onClearAll}>
                                        <div className="flex items-center justify-center gap-2 w-full py-1 text-red-400 hover:text-red-300 font-medium transition-colors">
                                            <Trash01 className="w-4 h-4" />
                                            <span>Poništi sve filtere</span>
                                        </div>
                                    </DropdownItem>
                                </DropdownSection>
                            </>
                        )}
                    </DropdownMenu>
                </DropdownPopover>
            </DropdownRoot>
        </div>
    );
};