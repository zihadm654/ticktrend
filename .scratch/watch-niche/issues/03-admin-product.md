# 03: Admin product model and editor

**What to build:** An admin can create and edit a watch with every watch specification and one or more dial/strap options. Each option has SKU, label, retail price, price, stock, barcode, default flag and active flag. The editor uses Basics, Options, Images and Features tabs, shows watch attribute chips and numeric spec fields, and reports validation errors against the exact field. The product list shows watch-relevant attributes instead of concentration. Existing admin authentication and argument-validation rules hold.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Product validation accepts the watch spec and option shape and rejects fractional money, price above retail, missing default option, more than one default, duplicate SKUs, and an inactive default on an active product.
- [ ] The editor can save a new watch and reload it with all specs and options intact.
- [ ] Option rows expose label, SKU, prices, stock, barcode, default and active controls; the millilitre size input is gone.
- [ ] Feature selection replaces the notes tab and preserves selected feature ids on save.
- [ ] The product list column shows movement and case size where concentration used to be.
- [ ] Admin schema tests cover the option invariants and a valid watch payload.
