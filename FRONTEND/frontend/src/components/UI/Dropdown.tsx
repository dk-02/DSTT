import {DropdownRoot} from "../base/dropdown/dropdown";
import {DropdownPopover} from "../base/dropdown/dropdown";
import {DropdownMenu} from "../base/dropdown/dropdown";
import {DropdownSection} from "../base/dropdown/dropdown";
import {DropdownItem} from "../base/dropdown/dropdown";
import {DropdownSeparator} from "../base/dropdown/dropdown";
import {DropdownDotsButton} from "../base/dropdown/dropdown";
// import {DropdownSectionHeader} from "../base/dropdown/dropdown";

interface CaseDropdownProps {
    onArchive: () => void;
    onEdit?: () => void;
}

export const Dropdown = ({ onArchive, onEdit }: CaseDropdownProps) => (
    <DropdownRoot>
        <DropdownDotsButton className={"absolute top-2 right-1"} />

        <DropdownPopover className="w-54 bg-gray-800 text-gray-100">
            <DropdownMenu>
                <DropdownSeparator />
                <DropdownSection>
                    <DropdownItem onAction={onEdit}>Uredi</DropdownItem>
                    <DropdownItem onAction={onArchive}>Arhiviraj</DropdownItem>
                </DropdownSection>
                <DropdownSeparator />
            </DropdownMenu>
        </DropdownPopover>
    </DropdownRoot>
);