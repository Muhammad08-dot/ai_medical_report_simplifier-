import fs from "fs";
import path from "path";

const DB_DIR = path.join(process.cwd(), "db_data");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export class Timestamp {
  private seconds: number;
  private nanoseconds: number;

  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  static now() {
    const d = new Date();
    return new Timestamp(Math.floor(d.getTime() / 1000), (d.getTime() % 1000) * 1e6);
  }

  static fromDate(date: Date) {
    return new Timestamp(Math.floor(date.getTime() / 1000), (date.getTime() % 1000) * 1e6);
  }

  toDate() {
    return new Date(this.seconds * 1000 + this.nanoseconds / 1e6);
  }
}

class MockDocRef {
  id: string;
  constructor(id: string) {
    this.id = id;
  }
}

class MockDocumentSnapshot {
  private _data: any;
  exists: boolean;

  constructor(data: any) {
    this._data = data;
    this.exists = !!data;
  }

  data() {
    if (!this._data) return undefined;
    return {
      ...this._data,
      createdAt: {
        toDate: () => new Date(this._data.createdAt),
      },
      expiresAt: {
        toDate: () => new Date(this._data.expiresAt),
      },
    };
  }
}

class MockDocumentReference {
  private id: string;
  private filePath: string;

  constructor(id: string) {
    this.id = id;
    this.filePath = path.join(DB_DIR, `${id}.json`);
  }

  async get() {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = await fs.promises.readFile(this.filePath, "utf8");
        return new MockDocumentSnapshot(JSON.parse(content));
      }
    } catch (e) {
      console.error("Local DB read error", e);
    }
    return new MockDocumentSnapshot(null);
  }
}

class MockCollectionReference {
  async add(data: any) {
    const id = Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);
    const filePath = path.join(DB_DIR, `${id}.json`);
    
    const serializedData = {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate().toISOString() : new Date().toISOString(),
    };

    await fs.promises.writeFile(filePath, JSON.stringify(serializedData, null, 2), "utf8");
    return new MockDocRef(id);
  }

  doc(id: string) {
    return new MockDocumentReference(id);
  }

  limit(_n?: number) {
    return this;
  }

  async get() {
    return { size: 1 };
  }
}

export function getAdminDb() {
  return {
    collection: (name: string) => {
      return new MockCollectionReference();
    },
  };
}

export const REPORTS_COLLECTION = "reports";
