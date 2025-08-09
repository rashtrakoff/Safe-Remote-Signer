import { MetaTransactionData } from "@safe-global/types-kit";

export interface DenyListRule {
    id: string;
    description: string;
    check: (transaction: MetaTransactionData) => boolean;
}

// Predefined deny list rules for dangerous operations
export const DENY_LIST_RULES: DenyListRule[] = [
    {
        id: "SAFE_OWNERSHIP_TRANSFER",
        description: "Prevent Safe ownership transfer operations",
        check: (tx: MetaTransactionData): boolean => {
            // Check for addOwnerWithThreshold, removeOwner, swapOwner function calls
            const dangerousFunctionSelectors = [
                "0x0d582f13", // addOwnerWithThreshold(address,uint256)
                "0xf8dc5dd9", // removeOwner(address,address,uint256)
                "0xe318b52b", // swapOwner(address,address,address)
                "0x694e80c3", // changeThreshold(uint256)
            ];

            return dangerousFunctionSelectors.some((selector) =>
                tx.data?.toLowerCase().startsWith(selector.toLowerCase())
            );
        },
    },
    {
        id: "SAFE_THRESHOLD_CHANGE",
        description: "Prevent Safe threshold change operations",
        check: (tx: MetaTransactionData): boolean => {
            // Check for changeThreshold function calls
            const dangerousFunctionSelectors = [
                "0x694e80c3", // changeThreshold(uint256)
            ];

            return dangerousFunctionSelectors.some((selector) =>
                tx.data?.toLowerCase().startsWith(selector.toLowerCase())
            );
        },
    },
    {
        id: "SAFE_MODULE_MANAGEMENT",
        description: "Prevent Safe module management operations",
        check: (tx: MetaTransactionData): boolean => {
            // Check for enableModule, disableModule function calls
            const dangerousFunctionSelectors = [
                "0x610b5925", // enableModule(address)
                "0xe009cfde", // disableModule(address,address)
            ];

            return dangerousFunctionSelectors.some((selector) =>
                tx.data?.toLowerCase().startsWith(selector.toLowerCase())
            );
        },
    },
    {
        id: "DELEGATE_CALL_RESTRICTION",
        description: "Prevent delegate calls to untrusted contracts",
        check: (tx: MetaTransactionData): boolean => {
            // Check if this is a delegate call (operation = 1)
            if (tx.operation !== 1) {
                return false;
            }

            // Get trusted delegate call contracts from env
            const trustedDelegateContracts = process.env[
                "TRUSTED_DELEGATE_CONTRACTS"
            ]
                ? process.env["TRUSTED_DELEGATE_CONTRACTS"]
                      .split(",")
                      .map((addr) => addr.trim().toLowerCase())
                : [];

            // If no trusted contracts are specified, deny all delegate calls
            if (trustedDelegateContracts.length === 0) {
                return true;
            }

            // Deny if target is not in trusted list
            if (
                tx.to &&
                !trustedDelegateContracts.includes(tx.to.toLowerCase())
            ) {
                return true;
            }

            return false;
        },
    },
];

export class DenyListChecker {
    private rules: DenyListRule[];

    constructor(customRules: DenyListRule[] = []) {
        this.rules = [...DENY_LIST_RULES, ...customRules];
    }

    /**
     * Check if a transaction should be denied based on deny list rules
     */
    isDenied(transaction: MetaTransactionData): {
        denied: boolean;
        reasons: string[];
    } {
        const deniedRules = this.rules.filter((rule) =>
            rule.check(transaction)
        );

        return {
            denied: deniedRules.length > 0,
            reasons: deniedRules.map(
                (rule) => `${rule.id}: ${rule.description}`
            ),
        };
    }

    /**
     * Add a custom deny rule
     */
    addRule(rule: DenyListRule): void {
        this.rules.push(rule);
    }

    /**
     * Remove a rule by ID
     */
    removeRule(ruleId: string): void {
        this.rules = this.rules.filter((rule) => rule.id !== ruleId);
    }

    /**
     * Get all active rules
     */
    getRules(): DenyListRule[] {
        return [...this.rules];
    }
}
