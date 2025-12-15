# Pedigree Draw

**English** | [繁體中文](README.zh-TW.md)

A professional pedigree (family tree) drawing tool for genetic counselors and bioinformatics professionals.

## Motivation & Background

This project is created by an author with Usher syndrome.

The motivation behind this work is to support research
in genetics, genealogy, and bioinformatics, and to explore
how visualization tools may assist in understanding
hereditary conditions.

The author explicitly supports research related to
Usher syndrome and other genetic disorders, and hopes
this project may contribute, even in a small way,
to the bioinformatics research community.


## Features

- Import/Export GATK PED files
- Interactive web-based editor
- Support for standard pedigree symbols (NSGC standards)
- Export to SVG, PNG, or PED format
- Full pedigree features: affected/unaffected/carrier status, twins, consanguinity, adoption markers, etc.

---

## Quick Start

### Prerequisites

You need **Node.js** (version 18 or higher) installed on your computer.

#### Check if Node.js is installed:

```bash
node --version
npm --version
```

If both commands show version numbers (e.g., `v20.10.0` and `10.2.0`), you're ready to go!

#### If Node.js is NOT installed:

**Windows:**
1. Go to https://nodejs.org/
2. Download the **LTS** version (recommended)
3. Run the installer, click "Next" through all steps
4. Restart your terminal/command prompt after installation

**macOS:**
```bash
# Using Homebrew (recommended)
brew install node

# Or download from https://nodejs.org/
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

### Step 1: Install Dependencies (First Time Only)

Open your terminal and navigate to the project folder:

```bash
cd /path/to/pedigree-draw
```

Install the required packages:

```bash
npm install
```

This will download all necessary dependencies. You only need to do this once (or after updating the code).

---

### Step 2: Start the Server

Run the start script:

```bash
./start.sh
```

**On Windows**, use:
```bash
npm run dev
```

You should see output like:
```
==========================================
  Pedigree Draw Server Started!
==========================================

  Local:   http://localhost:5173/pedigree-draw/
  Network: http://192.168.x.x:5173/pedigree-draw/

  To stop the server, run: ./stop.sh
==========================================
```

---

### Step 3: Open in Browser

Open your web browser and go to:

- **On this computer:** http://localhost:5173/pedigree-draw/
- **From another device on the same network:** Use the Network URL shown above

---

### Step 4: Stop the Server

When you're done, stop the server:

```bash
./stop.sh
```

**On Windows**, press `Ctrl+C` in the terminal to stop the server.

---

## How to Use the Application

### Creating a New Pedigree

1. Click **"New Pedigree"** in the left panel
2. Enter a Family ID (e.g., "FAM001")

### Adding Persons

Use the toolbar at the top:

| Button | Description |
|--------|-------------|
| Square | Add Male |
| Circle | Add Female |
| Diamond | Add Unknown Sex |

### Selecting a Person

- **Click** on a person to select them
- A blue dashed border will appear around the selected person
- The right panel will show editable properties

### Adding Relationships

First **select a person**, then use these toolbar buttons:

| Button | Description |
|--------|-------------|
| Add Spouse | Creates a spouse next to selected person with connection line |
| Add Child | Creates a child below the selected person |
| Add Parents | Creates both parents above the selected person |

### Editing Properties

When a person is selected, use the right panel to edit:

- **Label**: Display name
- **Sex**: Male / Female / Unknown
- **Phenotype**: Unaffected / Affected / Carrier / Unknown
- **Status**: Deceased, Proband, Adopted, Miscarriage, Stillbirth

### Canvas Controls

| Button | Description |
|--------|-------------|
| + | Zoom in |
| - | Zoom out |
| Reset | Reset to 100% zoom, centered |
| Fit | Fit all content to screen |

You can also:
- **Drag** persons to reposition them
- **Pan** the canvas by dragging the background
- **Scroll** to zoom in/out

### Importing a PED File

1. Click **"Import PED"** in the left panel, OR
2. Drag and drop a `.ped` file onto the drop zone

### Exporting

| Button | Description |
|--------|-------------|
| Export SVG | Vector image (for editing in Illustrator, etc.) |
| Export PNG | Raster image (for documents, presentations) |
| Export PED | GATK PED format file |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Delete** or **Backspace** | Delete selected person or relationship |
| **Escape** | Clear selection |
| **Ctrl+Z** | Undo |
| **Ctrl+Y** or **Ctrl+Shift+Z** | Redo |

### Editing Relationships

1. Click on the **connection line** between two people to select the relationship
2. The right panel will show relationship options:
   - **Add Child**: Add a Male/Female/Unknown child to this couple
   - **Partnership Status**: Married, Unmarried, Separated, Divorced
   - **Consanguinity**: Mark as consanguineous (blood relatives)
   - **Children Status**: Infertility or No children by choice

### Auto Align

If elements get messy after dragging, click the **Auto Align** button in the toolbar to automatically reposition all family members according to their generation and relationships.

---

## PED File Format

The tool supports standard GATK PED format (6 columns, whitespace-separated):

```
FamilyID  IndividualID  PaternalID  MaternalID  Sex  Phenotype
FAM001    father        0           0           1    1
FAM001    mother        0           0           2    1
FAM001    child1        father      mother      1    2
```

- **Sex**: 1 = Male, 2 = Female, 0 = Unknown
- **Phenotype**: 1 = Unaffected, 2 = Affected, 0 = Unknown
- **PaternalID/MaternalID**: Use "0" for unknown/founder

---

## Troubleshooting

### "Permission denied" when running ./start.sh

Make sure the scripts are executable:
```bash
chmod +x start.sh stop.sh
```

### Server won't start

1. Check if port 5173 is already in use:
   ```bash
   lsof -i :5173
   ```

2. Kill any existing process and try again:
   ```bash
   ./stop.sh
   ./start.sh
   ```

### Page won't load

- Make sure you're using the correct URL with `/pedigree-draw/` at the end
- Try clearing your browser cache and refreshing

### Can't access from another device

- Make sure both devices are on the same network
- Check your firewall settings allow port 5173
- Use the Network URL (not localhost)

---

## Development

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

### Deploy to GitHub Pages

```bash
npm run build
# Then upload the dist/ folder contents to your GitHub Pages
```

---

## License

MIT
